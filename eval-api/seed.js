const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const seed = async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/evalscan');

    const existingAdmin = await User.findOne({ email: 'admin@eval.com' });
    if (existingAdmin) {
        console.log('Admin user already exists: admin@eval.com');
        await mongoose.disconnect();
        return;
    }

    const admin = await User.create({
        name: 'Admin',
        email: 'admin@eval.com',
        password: 'Admin@123',
        role: 'admin'
    });

    console.log(`✅ Admin user created:`);
    console.log(`   Email   : admin@eval.com`);
    console.log(`   Password: Admin@123`);
    console.log(`   ID      : ${admin._id}`);

    await mongoose.disconnect();
};

seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
