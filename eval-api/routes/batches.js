const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Worker } = require('worker_threads');
const Test = require('../models/Test');
const TestBatch = require('../models/TestBatch');
const SheetRecord = require('../models/SheetRecord');
const { protect, apiKeyAuth } = require('../middleware/auth');

// Middleware that accepts either JWT or API key
const flexAuth = (req, res, next) => {
    console.log('flexAuth headers:', req.headers);
    const apiKey = req.headers['x-api-key'];
    if (apiKey) return apiKeyAuth(req, res, next);
    return protect(req, res, next);
};

const router = express.Router();

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || './uploads');
const EXTRACTED_DIR = path.resolve(process.env.EXTRACTED_DIR || './extracted');
const RESULTS_DIR = path.resolve(process.env.RESULTS_DIR || './results');
const JAR_PATH = path.resolve(process.env.JAR_PATH || './evalomr.jar');

[UPLOADS_DIR, EXTRACTED_DIR, RESULTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}-${file.originalname}`)
});
const upload = multer({ storage });

// POST /api/batches/upload/:testID – upload ZIP (API key OR JWT auth)
router.post('/upload/:testID', flexAuth, upload.single('file'), async (req, res) => {
    const { testID } = req.params;

    if (!req.file) {
        return res.status(400).json({ error: 'No ZIP file uploaded' });
    }

    try {
        const test = await Test.findById(testID);
        if (!test) return res.status(404).json({ error: 'Test not found' });

        const batch = await TestBatch.create({
            testID,
            uploadedZipPath: req.file.path,
            status: 'processing'
        });

        const batchID = batch._id.toString();

        // Spawn worker
        const worker = new Worker(path.resolve(__dirname, '../processor.js'), {
            workerData: {
                batchID,
                testID,
                zipPath: req.file.path,
                extractedDir: EXTRACTED_DIR,
                resultsDir: RESULTS_DIR,
                jarPath: JAR_PATH,
                templatePath: process.env.TEMPLATE_PATH || ''
            }
        });

        worker.on('error', async (err) => {
            console.error('Worker error:', err);
            await TestBatch.findByIdAndUpdate(batchID, { status: 'failed', errorMessage: err.message });
        });

        worker.on('exit', async (code) => {
            if (code !== 0) {
                console.error(`Worker exited with code ${code}`);
                await TestBatch.findByIdAndUpdate(batchID, { status: 'failed', errorMessage: `Exit code ${code}` });
            }
        });

        res.status(202).json({ batchID, testID, status: 'processing' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/batches/:testID – list all batches for a test
router.get('/:testID', protect, async (req, res) => {
    try {
        const batches = await TestBatch.find({ testID: req.params.testID }).sort({ createdAt: -1 });
        res.json(batches);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/batches/status/:batchID – get single batch status
router.get('/status/:batchID', protect, async (req, res) => {
    try {
        const batch = await TestBatch.findById(req.params.batchID);
        if (!batch) return res.status(404).json({ error: 'Batch not found' });
        res.json(batch);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
// DELETE /api/batches/:batchID – delete a batch and its records
router.delete('/:batchID', protect, async (req, res) => {
    try {
        const batch = await TestBatch.findById(req.params.batchID);
        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        // 1. Delete associated SheetRecords
        await SheetRecord.deleteMany({ batchID: batch._id });

        // 2. Delete Extracted Folder (resilient)
        try {
            const extractedFolderPath = path.join(EXTRACTED_DIR, batch._id.toString());
            if (fs.existsSync(extractedFolderPath)) {
                fs.rmSync(extractedFolderPath, { recursive: true, force: true });
            }
        } catch(e) { console.warn('Could not delete extracted folder:', e); }

        // 3. Delete uploaded zip code if available (resilient)
        try {
            if (batch.uploadedZipPath && fs.existsSync(batch.uploadedZipPath)) {
                fs.unlinkSync(batch.uploadedZipPath);
            }
        } catch(e) { console.warn('Could not delete zip:', e); }

        // 4. Delete the results json if present (resilient)
        try {
            const resultsFilePath = path.join(RESULTS_DIR, batch._id.toString() + '.json');
            if (fs.existsSync(resultsFilePath)) {
                fs.unlinkSync(resultsFilePath);
            }
        } catch(e) { console.warn('Could not delete results json:', e); }

        // 5. Delete batch from DB
        await TestBatch.findByIdAndDelete(batch._id);

        res.json({ success: true, message: 'Batch and all associated records deleted' });
    } catch (err) {
        console.error('Delete batch error:', err);
        res.status(500).json({ error: 'Server error during deletion' });
    }
});

module.exports = router;
