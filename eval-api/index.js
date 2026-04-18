const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');
const batchRoutes = require('./routes/batches');
const sheetRoutes = require('./routes/sheets');
const dashboardRoutes = require('./routes/dashboard');
const templateRoutes = require('./routes/template');
const TestBatch = require('./models/TestBatch');

const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB and Cleanup
connectDB().then(async () => {
    try {
        await TestBatch.updateMany(
            { status: 'processing' },
            { 
                status: 'failed', 
                errorMessage: 'Evaluation interrupted (possible server restart/crash)' 
            }
        );
    } catch (err) {
        console.error('Startup cleanup error:', err);
    }
});

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve extracted images statically (for sheet preview)
const EXTRACTED_DIR = path.resolve(process.env.EXTRACTED_DIR || './extracted');
if (!fs.existsSync(EXTRACTED_DIR)) fs.mkdirSync(EXTRACTED_DIR, { recursive: true });
app.use('/extracted', express.static(EXTRACTED_DIR));

// Serve public folder
app.use(express.static(path.join(__dirname, 'public')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/sheets', sheetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/template', templateRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
    console.log(`\n🚀 Eval Scan API running at http://localhost:${port}`);
    console.log(`   Extracted dir : ${EXTRACTED_DIR}`);
    console.log(`   MongoDB       : ${process.env.MONGO_URI || 'mongodb://localhost:27017/evalscan'}\n`);
});
