const { workerData, parentPort } = require('worker_threads');
const AdmZip = require('adm-zip');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
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
        const command = `"${javaPath}" -jar "${jarPath}" "${templatePath}" "${targetDir}"`;

        exec(command, async (error, stdout, stderr) => {
            if (error) {
                console.error(`JAR error: ${error.message}`);
                await TestBatch.findByIdAndUpdate(batchID, {
                    status: 'failed',
                    errorMessage: error.message
                });
                await mongoose.disconnect();
                return;
            }

            if (stderr) console.warn(`JAR stderr: ${stderr}`);

            // 3. Save result JSON to disk (legacy support)
            if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
            const resultFile = path.join(resultsDir, `${batchID}.json`);
            fs.writeFileSync(resultFile, stdout);

            // 4. Parse JSON and save SheetRecords to MongoDB
            try {
                const parsedJson = JSON.parse(stdout);
                
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
                        // Resolve the sheetName specifically from Side1-image if present
                        let explicitName = null;
                        if (item['Side1-image']) {
                            // Extract just the filename (e.g. Scan0001.jpg)
                            explicitName = path.basename(item['Side1-image']);
                        }
                        
                        const finalName = explicitName || item.sheetName || item.fileName || item.name;
                        
                        // If the JAR outputs a completely nameless generic error block, discard it
                        // to prevent phantom 'unknown' sheets. Any actual skipped image files will
                        // still be picked up automatically below in the getAllImages() fallback.
                        if (!finalName) {
                            console.warn('Discarding nameless result block:', item);
                            continue;
                        }

                        const sheetName = finalName;
                        // Find the image file path in extracted dir
                        const imagePath = findImagePath(targetDir, sheetName);
                        sheetRecords.push({
                            batchID,
                            testID,
                            sheetName,
                            sheetPath: imagePath || path.join(targetDir, sheetName),
                            result: item.result || {},  // The actual extracted bubble values
                            updated_result: {},
                            is_updated: false,
                            last_modified: new Date(),
                            status: item.status !== undefined ? item.status : true,
                            errorMessage: item['Side1-errorMessage'] || item.errorMessage || ''
                        });
                    }
                } else if (typeof resultData === 'object') {
                    // Object keyed by filename
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

                // Also scan for images not in result (ensure all images are recorded)
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
                console.error(`JSON parse error: ${parseErr.message}`);
                // Still save images even if JSON parse fails
                const allImages = getAllImages(targetDir);
                const sheetRecords = allImages.map(imgPath => ({
                    batchID,
                    testID,
                    sheetName: path.basename(imgPath),
                    sheetPath: imgPath,
                    result: { raw: stdout.substring(0, 500) },
                    updated_result: {},
                    is_updated: false,
                    last_modified: new Date()
                }));
                if (sheetRecords.length > 0) await SheetRecord.insertMany(sheetRecords);
                await TestBatch.findByIdAndUpdate(batchID, { status: 'completed' });
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
