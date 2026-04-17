const mongoose = require('mongoose');

const SheetRecordSchema = new mongoose.Schema({
    batchID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestBatch',
        required: true
    },
    testID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: true
    },
    sheetName: {
        type: String,
        required: true
    },
    sheetPath: {
        type: String,
        required: true
    },
    result: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    updated_result: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    is_updated: {
        type: Boolean,
        default: false
    },
    last_modified: {
        type: Date,
        default: Date.now
    },
    status: {
        type: Boolean,
        default: true
    },
    errorMessage: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('SheetRecord', SheetRecordSchema);
