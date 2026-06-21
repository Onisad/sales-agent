require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');

const healthController = require('./controllers/healthController');
const agentController = require('./agent/agentController');
const { cleanupOldFiles } = require('./utils/imageHelper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
    res.locals.salesSiteUrl = (process.env.SALES_SITE_URL || '').trim();
    next();
});

app.get('/', (req, res) => res.render('index'));

app.use('/health', healthController);
app.use('/agent', agentController);

app.post('/log-client-error', (req, res) => {
    const { message, stack, url, userAgent } = req.body;
    console.error(`CLIENT ERROR [${new Date().toISOString()}]: ${message}`, { stack, url, userAgent });
    res.status(200).json({ received: true });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    try {
        await cleanupOldFiles(24 * 60 * 60 * 1000);
    } catch (e) {
        console.error('Cleanup failed:', e.message);
    }
    setInterval(() => cleanupOldFiles(24 * 60 * 60 * 1000), 24 * 60 * 60 * 1000);
});

module.exports = app;
