const express = require('express');
const serverless = require('serverless-http');
const multer = require('multer');
const samsubService = require('../../samsubServices');

const app = express();

// RAW ONLY for webhook (must be before JSON)
app.post('/api/samsub/kyc/webhook', express.raw({ type: '*/*', limit: '5mb' }), (req, res, next) => next());

// JSON for everything else
app.use(express.json({ limit: '1mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// --- routes with absolute paths ---
app.get('/api/samsub/kyc/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString(), service: 'Sumsub KYC API', environment: process.env.NODE_ENV || 'development' });
});

app.post('/api/samsub/kyc/create-applicant', async (req, res) => { /* ...same logic... */ });
app.post('/api/samsub/kyc/upload-document', upload.single('document'), async (req, res) => { /* ... */ });
app.get('/api/samsub/kyc/status/:applicantId', async (req, res) => { /* ... */ });

app.post('/api/samsub/kyc/webhook', async (req, res) => {
  try {
    const raw = req.body;
    const signature = req.headers['x-payload-digest'];
    const alg = (req.headers['x-payload-digest-alg'] || 'sha256').toLowerCase();
    const ok = samsubService.verifyWebhookSignature(raw, signature, alg);
    if (!ok) return res.status(401).json({ success: false, error: { message: 'Invalid webhook signature' }, timestamp: new Date().toISOString() });
    const payload = JSON.parse(raw.toString('utf8'));
    // handle payload...
    res.json({ success: true, data: { received: true }, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false, error: { message: 'Failed to process webhook', error: e.message }, timestamp: new Date().toISOString() });
  }
});

app.post('/api/samsub/kyc/access-token', async (req, res) => { /* ... */ });
app.get('/api/samsub/kyc/generate-user-id', (req, res) => { /* ... */ });
app.post('/api/samsub/kyc/websdk-link', async (req, res) => { /* ... */ });
app.post('/api/samsub/kyc/init-automated', async (req, res) => { /* ... */ });
app.get('/api/samsub/kyc/levels', async (req, res) => { /* ... */ });
app.post('/api/samsub/kyc/request-check', async (req, res) => { /* ... */ });
app.get('/api/samsub/kyc/applicant/:applicantId', async (req, res) => { /* ... */ });
app.post('/api/samsub/kyc/reset', async (req, res) => { /* ... */ });

module.exports = (req, res) => serverless(app)(req, res);
module.exports.config = { runtime: 'nodejs20.x' };
