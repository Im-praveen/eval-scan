const mongoose = require('mongoose');

const TestSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    conductDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'active', 'completed'],
        default: 'scheduled'
    },
    blockOrder: {
        type: [String],
        default: []
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Test', TestSchema);
