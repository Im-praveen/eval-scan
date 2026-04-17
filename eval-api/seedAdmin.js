const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher'], default: 'teacher' },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

const adminData = {
    _id: "69df476495ec76c83aad533c",
    name: "Admin",
    email: "admin@eval.com",
    password: "$2a$10$ZrxC6M9fYml6E3phwbhEKuY46NRLSjmK02/hVPnXcRJbIB3jY6ZrO",
    role: "admin",
    createdAt: new Date("2026-04-15T08:08:04.515Z"),
    updatedAt: new Date("2026-04-15T08:08:04.515Z"),
    __v: 0
};

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/evalscan');
        console.log('Connected to MongoDB');

        // Check if user already exists
        const existing = await User.findOne({ email: adminData.email });
        if (existing) {
            console.log('Admin user already exists. Skipping insertion.');
        } else {
            await User.create(adminData);
            console.log('Admin user created successfully!');
        }
        
    } catch (err) {
        console.error('Seeding error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

seed();
