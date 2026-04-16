const express = require('express');
const { body, validationResult } = require('express-validator');
const Test = require('../models/Test');
const SheetRecord = require('../models/SheetRecord');
const { protect, apiKeyAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tests
 *   description: OMR Test/Exam management
 */

// GET /api/tests – list all tests
/**
 * @swagger
 * /api/tests:
 *   get:
 *     summary: List all tests
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Test'
 */
router.get('/', protect, async (req, res) => {
    try {
        const tests = await Test.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(tests);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/tests/public-list – listing for integrated applications
/**
 * @swagger
 * /api/tests/public-list:
 *   get:
 *     summary: Get a list of tests with their public upload URLs (for integrations)
 *     tags: [Tests]
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         description: System API Key for authentication
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tests with integration URLs
 */
router.get('/public-list', apiKeyAuth, async (req, res) => {
    try {
        const tests = await Test.find({ status: { $ne: 'deleted' } })
            .sort({ createdAt: -1 })
            .select('name conductDate status');

        const apiKey = process.env.API_KEY || 'evalscan_secret_key_2024';
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const list = tests.map(t => ({
            ...t._doc
        }));

        res.json(list);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/tests/:id – get single test
/**
 * @swagger
 * /api/tests/{id}:
 *   get:
 *     summary: Get test details
 *     tags: [Tests]
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
 *         description: Test details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Test'
 *       404:
 *         description: Test not found
 */
router.get('/:id', protect, async (req, res) => {
    try {
        const test = await Test.findById(req.params.id).populate('createdBy', 'name email');
        if (!test) return res.status(404).json({ error: 'Test not found' });
        res.json(test);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/tests – create test
/**
 * @swagger
 * /api/tests:
 *   post:
 *     summary: Create a new test
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, conductDate]
 *             properties:
 *               name: { type: string }
 *               conductDate: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Test created
 *       400:
 *         description: Validation error
 */
router.post('/', protect, [
    body('name').notEmpty().withMessage('Test name is required'),
    body('conductDate')
        .notEmpty().withMessage('Conduct date is required')
        .isISO8601().withMessage('Invalid date format')
        .custom((value) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const date = new Date(value);
            if (date < today) {
                throw new Error('Conduct date must be today or a future date');
            }
            return true;
        })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, conductDate } = req.body;
        const test = await Test.create({
            name,
            conductDate: new Date(conductDate),
            createdBy: req.user._id
        });
        res.status(201).json(test);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/tests/:id – update test status
router.patch('/:id', protect, async (req, res) => {
    try {
        const { status } = req.body;
        const test = await Test.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!test) return res.status(404).json({ error: 'Test not found' });
        res.json(test);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/tests/:id/export – export final extracted result json
/**
 * @swagger
 * /api/tests/{id}/export:
 *   get:
 *     summary: Export final processed OMR results as JSON
 *     tags: [Tests]
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
 *         description: Aggregated OMR data
 *       404:
 *         description: Test not found
 */
router.get('/:id/export', protect, async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        if (!test) return res.status(404).json({ error: 'Test not found' });

        const sheets = await SheetRecord.find({ testID: req.params.id });

        const surveys = [];

        for (const sheet of sheets) {
            // Priority to updated_result if reviewed, else fallback to raw result
            const rawResult = sheet.result || {};
            const finalResult = Object.keys(sheet.updated_result || {}).length > 0
                ? sheet.updated_result
                : rawResult;

            const survey = {};
            const responses = [];
            const order = (test.blockOrder && test.blockOrder.length > 0) ? test.blockOrder : Object.keys(finalResult);
            const seenKeys = new Set();

            const addField = (key, valObj) => {
                if (seenKeys.has(key)) return;
                seenKeys.add(key);

                const value = (typeof valObj === 'object' && valObj !== null && valObj.value !== undefined)
                    ? String(valObj.value)
                    : String(valObj);

                const qMatch = key.match(/^q(?:uestion)?\s*(\d+)$/i);
                if (qMatch) {
                    responses.push({
                        questionNo: parseInt(qMatch[1], 10),
                        answer: value
                    });
                } else if (!['errorMessage', 'image', 'status', 'Side1-image', 'Side1-question', 'sheetname', 'filename'].some(k => key.toLowerCase().includes(k.toLowerCase()))) {
                    let finalKey = key;
                    if (key.toLowerCase() === 'rollno' || key.toLowerCase() === 'roll no') finalKey = 'StudentCode';
                    if (key.toLowerCase() === 'class') finalKey = 'Grade';
                    survey[finalKey] = value;
                }
            };

            // 1. Follow blockOrder first
            for (const key of order) {
                if (finalResult[key] !== undefined) {
                    addField(key, finalResult[key]);
                }
            }

            // 2. Add leftovers
            for (const key of Object.keys(finalResult)) {
                addField(key, finalResult[key]);
            }

            // 3. Add responses at the end to ensure it's the last key
            survey.responses = responses;
            surveys.push(survey);
        }

        res.json({ surveys });
    } catch (err) {
        console.error('Export Error:', err);
        res.status(500).json({ error: 'Server error during export' });
    }
});

module.exports = router;
