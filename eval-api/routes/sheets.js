const express = require('express');
const path = require('path');
const fs = require('fs');
const SheetRecord = require('../models/SheetRecord');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Sheets
 *   description: Individual OMR sheet record management
 */

// GET /api/sheets/by-test/:testID – ALL sheets across all batches for a test
/**
 * @swagger
 * /api/sheets/by-test/{testID}:
 *   get:
 *     summary: List all sheet records for a test (across all batches)
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sheets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SheetRecord'
 */
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
/**
 * @swagger
 * /api/sheets/image/{sheetRecordID}:
 *   get:
 *     summary: Serve the scanned sheet image file
 *     tags: [Sheets]
 *     parameters:
 *       - in: path
 *         name: sheetRecordID
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         description: JWT token (fallback for direct image links)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image file
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 */
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
/**
 * @swagger
 * /api/sheets/{batchID}:
 *   get:
 *     summary: List all sheet records for a specific batch
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sheets in batch
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SheetRecord'
 */
router.get('/:batchID', protect, async (req, res) => {
    try {
        const sheets = await SheetRecord.find({ batchID: req.params.batchID }).sort({ sheetName: 1 });
        res.json(sheets);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/sheets/:sheetRecordID – update result for a sheet
/**
 * @swagger
 * /api/sheets/{id}:
 *   patch:
 *     summary: Update/Override OMR results for a specific sheet
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updated_result: { type: object }
 *     responses:
 *       200:
 *         description: Sheet record updated
 *       404:
 *         description: Sheet record not found
 */
router.patch('/:sheetRecordID', protect, async (req, res) => {
    try {
        const { updated_result } = req.body;
        const sheet = await SheetRecord.findByIdAndUpdate(
            req.params.sheetRecordID,
            {
                updated_result,
                is_updated: true,
                status: true,
                // Removed errorMessage: '' to preserve original JAR feedback as requested
                last_modified: new Date()
            },
            { new: true }
        );
        if (!sheet) return res.status(404).json({ error: 'Sheet record not found' });
        
        // Populate batchID so Frontend grouping stays stable
        await sheet.populate('batchID', 'createdAt status');
        
        res.json(sheet);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/sheets/:sheetRecordID – delete a single sheet record
/**
 * @swagger
 * /api/sheets/{id}:
 *   delete:
 *     summary: Delete a single sheet record and its image file
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sheet record deleted
 *       404:
 *         description: Sheet not found
 */
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
