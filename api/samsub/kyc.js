const express = require('express');
const serverless = require('serverless-http');
const multer = require('multer');
const samsubService = require('../../samsubServices');

const app = express();
const r = express.Router();

// raw body ONLY for webhook (needs to be on the exact full path)
app.post('/api/samsub/kyc/webhook', express.raw({ type: '*/*', limit: '5mb' }), async (req, res) => {
  try {
    const raw = req.body; // Buffer
    const sig = req.headers['x-payload-digest'];
    const alg = (req.headers['x-payload-digest-alg'] || 'sha256').toLowerCase();
    const ok = samsubService.verifyWebhookSignature(raw, sig, alg);
    if (!ok) return res.status(401).json({ success: false, error: { message: 'Invalid webhook signature' }, timestamp: new Date().toISOString() });
    const payload = JSON.parse(raw.toString('utf8'));
    console.log('webhook:', payload.type, payload.applicantId);
    return res.json({ success: true, data: { received: true }, timestamp: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ success: false, error: { message: 'Webhook error', detail: e.message }, timestamp: new Date().toISOString() });
  }
});

// JSON for everything else
app.use(express.json({ limit: '1mb' }));

// memory uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ---- define routes RELATIVE to the base ----
r.get('/health', (req, res) => {
  res.json({
    status: 'online',
    ts: new Date().toISOString(),
    service: 'Sumsub KYC API',
    envFlags: {
      hasAppToken: !!process.env.SUMSUB_APP_TOKEN,
      hasAppSecret: !!process.env.SUMSUB_APP_SECRET,
      hasWebhookSecret: !!process.env.SUMSUB_WEBHOOK_SECRET
    }
  });
});

r.post('/create-applicant', async (req, res) => {
  try {
    const { externalUserId, levelName, email, firstName, lastName, phone } = req.body;
    if (!externalUserId || !levelName) return res.status(400).json({ success:false, error:{ message:'Missing required fields', required:['externalUserId','levelName'] }});
    const out = await samsubService.createApplicant({ externalUserId, levelName, email, firstName, lastName, phone });
    res.json({ success:true, data: out, timestamp: new Date().toISOString() });
  } catch (e) {
    const status = e?.code === 'SAMSUB_CONFIG_MISSING' ? 503 : 500;
    res.status(status).json({ success:false, error:{ message: 'Failed to create applicant', detail: e.message, code: e.code }, timestamp: new Date().toISOString() });
  }
});

r.post('/upload-document', upload.single('document'), async (req, res) => {
  try {
    const { applicantId, documentType } = req.body;
    const file = req.file;
    if (!applicantId || !documentType || !file) return res.status(400).json({ success:false, error:{ message:'Missing required fields', required:['applicantId','documentType','document'] }});
    const result = await samsubService.uploadDocument(applicantId, {
      documentType,
      fileName: file.originalname.replace(/[^a-zA-Z0-9.\-_]/g,'_'),
      fileBuffer: file.buffer,
      mimeType: file.mimetype
    });
    res.json({ success:true, data: result, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success:false, error:{ message:'Failed to upload document', detail: e.message }, timestamp: new Date().toISOString() });
  }
});

r.get('/status/:applicantId', async (req, res) => {
  try {
    const data = await samsubService.getApplicantStatus(req.params.applicantId);
    res.json({ success:true, data, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success:false, error:{ message:'Failed to get status', detail: e.message }, timestamp: new Date().toISOString() });
  }
});

r.post('/access-token', async (req, res) => {
  try {
    const { applicantId, levelName } = req.body;
    if (!applicantId) return res.status(400).json({ success:false, error:{ message:'Applicant ID is required' }});
    const token = await samsubService.generateAccessToken(applicantId, levelName);
    res.json({ success:true, data:{ token }, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success:false, error:{ message:'Failed to generate access token', detail: e.message }, timestamp: new Date().toISOString() });
  }
});

r.post('/websdk-link', async (req, res) => {
  try {
    const { applicantId, externalUserId, levelName='basic-kyc-level' } = req.body;
    if (!applicantId && !externalUserId) return res.status(400).json({ success:false, error:{ message:'Either applicantId or externalUserId is required' }});
    const linkData = await samsubService.generateWebSDKLink({ applicantId, externalUserId, levelName });
    res.json({ success:true, data: linkData, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success:false, error:{ message:'Failed to generate WebSDK link', detail: e.message }, timestamp: new Date().toISOString() });
  }
});

r.post('/init-automated', async (req, res) => {
  try {
    const { externalUserId, levelName='basic-kyc-level', email, firstName, lastName, phone } = req.body;
    if (!externalUserId) return res.status(400).json({ success:false, error:{ message:'External user ID is required' }});
    const applicant = await samsubService.createApplicant({ externalUserId, levelName, email, firstName, lastName, phone });
    const accessToken = await samsubService.generateAccessToken(applicant.id, levelName);
    const webSDKLink = await samsubService.generateWebSDKLink({ applicantId: applicant.id, externalUserId, levelName });
    res.json({ success:true, data:{ applicant, accessToken, webSDKLink }, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success:false, error:{ message:'Failed to init automated verification', detail: e.message }, timestamp: new Date().toISOString() });
  }
});

r.get('/levels', async (_req, res) => {
  try {
    const levels = await samsubService.getApplicantLevels();
    res.json({ success:true, data: levels, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success:false, error:{ message:'Failed to get levels', detail: e.message }, timestamp: new Date().toISOString() });
  }
});

r.post('/request-check', async (req, res) => {
  try {
    const { applicantId } = req.body;
    if (!applicantId) return res.status(400).json({ success:false, error:{ message:'Applicant ID is required' }});
    const result = await samsubService.requestApplicantCheck(applicantId);
    res.json({ success:true, data: result, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success:false, error:{ message:'Failed to request check', detail: e.message }, timestamp: new Date().toISOString() });
  }
});

r.get('/applicant/:applicantId', async (req, res) => {
  try {
    const data = await samsubService.getApplicantData(req.params.applicantId);
    res.json({ success:true, data, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success:false, error:{ message:'Failed to get applicant data', detail: e.message }, timestamp: new Date().toISOString() });
  }
});

r.post('/reset', async (req, res) => {
  try {
    const { applicantId } = req.body;
    if (!applicantId) return res.status(400).json({ success:false, error:{ message:'Applicant ID is required' }});
    const result = await samsubService.resetApplicant(applicantId);
    res.json({ success:true, data: result, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success:false, error:{ message:'Failed to reset applicant', detail: e.message }, timestamp: new Date().toISOString() });
  }
});

// mount router at the function base path
app.use('/api/samsub/kyc', r);

// export
module.exports = (req, res) => serverless(app)(req, res);
