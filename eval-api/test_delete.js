const mongoose = require('mongoose');
const TestBatch = require('./models/TestBatch');
const SheetRecord = require('./models/SheetRecord');

async function testDelete() {
    await mongoose.connect('mongodb://localhost:27017/evalscan');
    const batch = await TestBatch.findOne({});
    if (!batch) {
        console.log('No batches found');
        process.exit(0);
    }
    console.log('Found batch:', batch._id);
    
    try {
        await SheetRecord.deleteMany({ batchID: batch._id });
        console.log('Deleted sheets');
        await TestBatch.findByIdAndDelete(batch._id);
        console.log('Deleted batch');
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
testDelete();
