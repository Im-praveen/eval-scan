const express = require('express');
const Test = require('../models/Test');
const TestBatch = require('../models/TestBatch');
const SheetRecord = require('../models/SheetRecord');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Global system statistics and activity
 */

// GET /api/dashboard/stats
/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get overall system statistics for the dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Global statistics and recent activity
 */
router.get('/stats', protect, async (req, res) => {
    try {
        const [
            totalTests,
            totalBatches,
            totalSheets,
            processingBatches,
            completedBatches,
            failedBatches,
            updatedSheets
        ] = await Promise.all([
            Test.countDocuments(),
            TestBatch.countDocuments(),
            SheetRecord.countDocuments(),
            TestBatch.countDocuments({ status: 'processing' }),
            TestBatch.countDocuments({ status: 'completed' }),
            TestBatch.countDocuments({ status: 'failed' }),
            SheetRecord.countDocuments({ is_updated: true })
        ]);

        // Recent tests
        const recentTests = await Test.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name conductDate status createdAt');

        // Recent batches
        const recentBatches = await TestBatch.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('testID', 'name');

        res.json({
            totalTests,
            totalBatches,
            totalSheets,
            processingBatches,
            completedBatches,
            failedBatches,
            updatedSheets,
            recentTests,
            recentBatches
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
