const { workerData, parentPort } = require('worker_threads');
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const os = require('os');
require('dotenv').config();

// Models
const Test = require('./models/Test');
const TestBatch = require('./models/TestBatch');
const SheetRecord = require('./models/SheetRecord');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff'];

function isImage(filePath) {
    return IMAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

async function processZip() {
    const { batchID, testID, zipPath, extractedDir, resultsDir, jarPath, templatePath } = workerData;

    // Connect to MongoDB inside worker
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/evalscan');

    try {
        // 1. Extract zip
        const targetDir = path.join(extractedDir, batchID);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(targetDir, true);

        // Update batch with extracted dir
        await TestBatch.findByIdAndUpdate(batchID, { extractedDir: targetDir });

        // 2. Run JAR
        const javaPath = process.env.JAVA_PATH || 'java';
        
        // Dynamic Heap Memory: Use 50% of total system memory
        const totalMemMB = Math.floor(os.totalmem() / (1024 * 1024));
        const heapSizeMB = Math.floor(totalMemMB * 0.5);
        const xmxFlag = `-Xmx${heapSizeMB}m`;

        console.log(`Starting JAR for batch ${batchID} with heap ${heapSizeMB}MB...`);
        
        const args = [xmxFlag, '-jar', jarPath, templatePath, targetDir];
        const child = spawn(javaPath, args);

        let stdoutData = '';
        let stderrData = '';

        // Safety Timeout: 15 minutes
        const timeout = setTimeout(() => {
            child.kill();
            console.error(`Batch ${batchID} timed out.`);
        }, 15 * 60 * 1000);

        child.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        child.on('close', async (code) => {
            clearTimeout(timeout);

            if (code !== 0) {
                console.error(`JAR error for batch ${batchID} (Code ${code}): ${stderrData}`);
                await TestBatch.findByIdAndUpdate(batchID, {
                    status: 'failed',
                    errorMessage: (stderrData || `Exited with code ${code}`).substring(0, 1000)
                });
                await mongoose.disconnect();
                return;
            }

            // 3. Save result JSON to disk (legacy support)
            if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
            const resultFile = path.join(resultsDir, `${batchID}.json`);
            fs.writeFileSync(resultFile, stdoutData);

            // 4. Parse JSON and save SheetRecords to MongoDB
            try {
                if (!stdoutData.trim()) throw new Error('JAR produced empty output');
                
                const parsedJson = JSON.parse(stdoutData);
                
                // Result shape is either { resultData, blockOrder } or array directly
                const resultData = parsedJson.resultData || (Array.isArray(parsedJson) ? parsedJson : []);
                const blockOrder = parsedJson.blockOrder || [];

                // Store blockOrder in the Test document if it's found
                if (blockOrder.length > 0) {
                    await Test.findByIdAndUpdate(testID, { blockOrder });
                }

                const sheetRecords = [];

                if (Array.isArray(resultData)) {
                    for (const item of resultData) {
                        let explicitName = null;
                        if (item['Side1-image']) {
                            explicitName = path.basename(item['Side1-image']);
                        }
                        
                        const finalName = explicitName || item.sheetName || item.fileName || item.name;
                        
                        if (!finalName) {
                            console.warn('Discarding nameless result block:', item);
                            continue;
                        }

                        const sheetName = finalName;
                        const imagePath = findImagePath(targetDir, sheetName);
                        sheetRecords.push({
                            batchID,
                            testID,
                            sheetName,
                            sheetPath: imagePath || path.join(targetDir, sheetName),
                            result: item.result || {},
                            updated_result: {},
                            is_updated: false,
                            last_modified: new Date(),
                            status: item.status !== undefined ? item.status : true,
                            errorMessage: item['Side1-errorMessage'] || item.errorMessage || ''
                        });
                    }
                } else if (typeof resultData === 'object') {
                    for (const [sheetName, result] of Object.entries(resultData)) {
                        const imagePath = findImagePath(targetDir, sheetName);
                        sheetRecords.push({
                            batchID,
                            testID,
                            sheetName,
                            sheetPath: imagePath || path.join(targetDir, sheetName),
                            result,
                            updated_result: {},
                            is_updated: false,
                            last_modified: new Date()
                        });
                    }
                }

                // Scan for missing images
                const allImages = getAllImages(targetDir);
                for (const imgPath of allImages) {
                    const imgName = path.basename(imgPath);
                    const alreadyAdded = sheetRecords.find(r => r.sheetName === imgName);
                    if (!alreadyAdded) {
                        sheetRecords.push({
                            batchID,
                            testID,
                            sheetName: imgName,
                            sheetPath: imgPath,
                            result: {},
                            updated_result: {},
                            is_updated: false,
                            last_modified: new Date()
                        });
                    }
                }

                if (sheetRecords.length > 0) {
                    await SheetRecord.insertMany(sheetRecords);
                }

                await TestBatch.findByIdAndUpdate(batchID, { status: 'completed' });
                console.log(`Batch ${batchID} completed: ${sheetRecords.length} sheet(s) saved`);
            } catch (parseErr) {
                console.error(`Process result error: ${parseErr.message}`);
                const allImages = getAllImages(targetDir);
                const sheetRecords = allImages.map(imgPath => ({
                    batchID,
                    testID,
                    sheetName: path.basename(imgPath),
                    sheetPath: imgPath,
                    result: { raw_snippet: stdoutData.substring(0, 500) },
                    updated_result: {},
                    is_updated: false,
                    last_modified: new Date()
                }));
                if (sheetRecords.length > 0) await SheetRecord.insertMany(sheetRecords);
                await TestBatch.findByIdAndUpdate(batchID, { 
                    status: 'completed',
                    errorMessage: `JSON processed with issues: ${parseErr.message}` 
                });
            }

            await mongoose.disconnect();
        });

    } catch (err) {
        console.error(`Processor error: ${err.message}`);
        await TestBatch.findByIdAndUpdate(batchID, { status: 'failed', errorMessage: err.message });
        await mongoose.disconnect();
    }
}

function findImagePath(dir, sheetName) {
    const base = path.basename(sheetName, path.extname(sheetName));
    for (const ext of IMAGE_EXTENSIONS) {
        const candidate = path.join(dir, base + ext);
        if (fs.existsSync(candidate)) return candidate;
    }
    // Try full name
    const full = path.join(dir, sheetName);
    if (fs.existsSync(full)) return full;
    return null;
}

function getAllImages(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            results.push(...getAllImages(fullPath));
        } else if (isImage(item.name)) {
            results.push(fullPath);
        }
    }
    return results;
}

processZip();
