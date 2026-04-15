const mongoose = require('mongoose');

const TestBatchSchema = new mongoose.Schema({
    testID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: true
    },
    uploadedZipPath: {
        type: String,
        required: true
    },
    extractedDir: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    errorMessage: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('TestBatch', TestBatchSchema);
