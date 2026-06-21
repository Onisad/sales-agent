// Load environment variables FIRST, before any other requires
// This is critical because ItemService singleton reads env vars in its constructor
require('dotenv').config();

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');

// Import controllers
const healthController = require('./controllers/healthController');
const productController = require('./controllers/productController');
const pricingController = require('./controllers/pricingController');
const salesController = require('./controllers/salesController');
const emailController = require('./controllers/emailController');
const itemController = require('./controllers/itemController');
const agentController = require('./agent/agentController');
const { cleanupOldFiles } = require('./utils/imageHelper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set up Pug as view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Make sales site URL available to all views (from .env)
app.use((req, res, next) => {
    const url = process.env.SALES_SITE_URL;
    res.locals.salesSiteUrl = (typeof url === 'string' ? url : '').trim();
    next();
});

// Configure multer for file uploads (for direct /send-email route)
const upload = multer({ storage: multer.memoryStorage() });

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// Health checks
app.use('/health', healthController);

// Product identification
app.use('/product', productController);

// Pricing generation
app.use('/pricing', pricingController.router);

// Sales text generation
app.use('/sales', salesController.router);

// Email functionality
app.use('/email', emailController.router);

// Item creation
app.use('/item', itemController.router);

// Agentic endpoint — one POST drives the full identify → price → write → save loop
// Response is a text/event-stream (SSE); see agent/agentController.js for event shapes
app.use('/agent', agentController);

// Legacy routes for backward compatibility
app.post('/identify-product', productController);
app.post('/complete-analysis', productController);
app.post('/generate-analysis', productController);
app.post('/generate-pricing', pricingController.router);
app.post('/generate-sales-text', salesController.router);
// Direct route for /send-email (legacy support)
app.post('/send-email', upload.single('image'), async (req, res) => {
    const { sendEmailWithData } = emailController;
    try {
        const { pricing, salesText, productName } = req.body;

        if (!pricing || !salesText) {
            return res.status(400).json({ error: 'Pricing and sales text are required' });
        }

        const emailData = {
            pricing: JSON.parse(pricing),
            salesText,
            image: req.file ? req.file.buffer : null,
            productName: productName || 'Unknown Product'
        };

        const result = await sendEmailWithData(emailData);

        res.json({
            success: true,
            message: 'Email sent successfully',
            messageId: result.messageId
        });

    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({
            error: 'Email sending failed',
            message: error.message
        });
    }
});
app.use('/create-item', itemController.router);

// Error logging endpoint
app.post('/log-client-error', express.json(), (req, res) => {
    const { message, stack, url, userAgent } = req.body;
    console.error('Client Error:', { message, stack, url, userAgent });
    
    // Also log to a more visible format
    console.error(`🚨 CLIENT ERROR [${new Date().toISOString()}]: ${message}`);
    if (stack) {
        console.error('Stack trace:', stack);
    }
    
    res.status(200).json({ received: true });
});

// Favicon endpoint
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Cleanup old files on startup
async function initializeCleanup() {
    try {
        console.log('🧹 Running initial cleanup of old files...');
        const result = await cleanupOldFiles(24 * 60 * 60 * 1000); // 24 hours
        if (result.deleted > 0) {
            console.log(`✅ Cleanup completed: ${result.deleted} old files deleted`);
        } else {
            console.log('✅ No old files to clean up');
        }
    } catch (error) {
        console.error('❌ Failed to run initial cleanup:', error.message);
    }
}

// Schedule regular cleanup (every 24 hours)
function scheduleCleanup() {
    const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    setInterval(async () => {
        try {
            console.log('🧹 Running scheduled cleanup of old files...');
            const result = await cleanupOldFiles(24 * 60 * 60 * 1000); // 24 hours
            if (result.deleted > 0) {
                console.log(`✅ Scheduled cleanup completed: ${result.deleted} old files deleted`);
            }
        } catch (error) {
            console.error('❌ Failed to run scheduled cleanup:', error.message);
        }
    }, cleanupInterval);
    
    console.log('⏰ Scheduled cleanup job: runs every 24 hours');
}

// Start server
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Make sure your Open WebUI is accessible and models are configured!');
    
    // Run initial cleanup
    await initializeCleanup();
    
    // Schedule regular cleanup
    scheduleCleanup();
});

module.exports = app;
