const express = require('express');
const path = require('path');
const fs = require('fs');
const SheetRecord = require('../models/SheetRecord');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/sheets/by-test/:testID – ALL sheets across all batches for a test
router.get('/by-test/:testID', protect, async (req, res) => {
    try {
        const sheets = await SheetRecord.find({ testID: req.params.testID })
            .populate('batchID', 'createdAt status')
            .sort({ sheetName: 1 });
        res.json(sheets);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/sheets/image/:sheetRecordID – serve the sheet image
router.get('/image/:sheetRecordID', async (req, res) => {
    try {
        const sheet = await SheetRecord.findById(req.params.sheetRecordID);
        if (!sheet) return res.status(404).json({ error: 'Sheet record not found' });

        const imagePath = sheet.sheetPath;
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({ error: 'Image file not found on disk' });
        }

        res.sendFile(path.resolve(imagePath));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/sheets/:batchID – list all sheet records for a batch
router.get('/:batchID', protect, async (req, res) => {
    try {
        const sheets = await SheetRecord.find({ batchID: req.params.batchID }).sort({ sheetName: 1 });
        res.json(sheets);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/sheets/:sheetRecordID – update result for a sheet
router.patch('/:sheetRecordID', protect, async (req, res) => {
    try {
        const { updated_result } = req.body;
        const sheet = await SheetRecord.findByIdAndUpdate(
            req.params.sheetRecordID,
            {
                updated_result,
                is_updated: true,
                last_modified: new Date()
            },
            { new: true }
        );
        if (!sheet) return res.status(404).json({ error: 'Sheet record not found' });
        res.json(sheet);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/sheets/:sheetRecordID – delete a single sheet record
router.delete('/:sheetRecordID', protect, async (req, res) => {
    try {
        const sheet = await SheetRecord.findById(req.params.sheetRecordID);
        if (!sheet) return res.status(404).json({ error: 'Sheet not found' });

        try {
            if (fs.existsSync(sheet.sheetPath)) {
                fs.unlinkSync(sheet.sheetPath);
            }
        } catch(e) { console.warn('Could not delete sheet image file:', e); }

        await SheetRecord.findByIdAndDelete(sheet._id);
        res.json({ success: true, message: 'Sheet record deleted' });
    } catch (err) {
        console.error('Delete sheet error:', err);
        res.status(500).json({ error: 'Server error during deletion' });
    }
});

module.exports = router;
