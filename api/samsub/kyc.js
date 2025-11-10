// ./api/samsub/kyc.js  (Vercel serverless function)
const express = require('express');
const serverless = require('serverless-http');
const multer = require('multer');
const samsubService = require('../../samsubServices'); // <- path to your service file

const app = express();

// ---------- helpers ----------
const helpers = {
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{7,15}$/;
    return phoneRegex.test(phone);
  },
  sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9\.\-_]/g, '_');
  },
  getFileExtension(filename) { return filename.split('.').pop().toLowerCase(); },
  isValidDocumentType(filename) {
    const allowed = ['jpg', 'jpeg', 'png', 'pdf'];
    return allowed.includes(helpers.getFileExtension(filename));
  },
  formatResponse(success, data = null, error = null) {
    const response = { success, timestamp: new Date().toISOString() };
    if (success && data) response.data = data;
    if (!success && error) response.error = error;
    return response;
  },
  handleError(res, error, fallbackMessage, logContext = 'Sumsub KYC error') {
    const status = error?.code === 'SAMSUB_CONFIG_MISSING' ? 503 : 500;
    const message = status === 503
      ? 'Sumsub integration is not configured. Please contact support.'
      : fallbackMessage;
    console.error(logContext, error);
    const payload = { message, error: error.message };
    if (error.code) payload.code = error.code;
    return res.status(status).json(helpers.formatResponse(false, null, payload));
  },
  generateExternalUserId(prefix = 'user') {
    const ts = Date.now();
    const rnd = Math.random().toString(36).slice(2, 9);
    return `${prefix}_${ts}_${rnd}`;
  },
  parseWebhookType(payload) {
    const map = {
      applicantReviewed: 'Applicant verification completed',
      applicantPending: 'Applicant pending review',
      applicantActionPending: 'Applicant action required',
      applicantOnHold: 'Applicant on hold',
      applicantActionOnHold: 'Applicant action on hold'
    };
    return map[payload.type] || `Unknown webhook type: ${payload.type}`;
  },
  logRequest(req, endpoint) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${endpoint}`);
  }
};

// ---------- body parsers ----------
// RAW only for webhook (for HMAC). This must be mounted BEFORE JSON parser.
app.post('/webhook', express.raw({ type: '*/*', limit: '1mb' }), (req, res, next) => next());

// JSON for everything else
app.use(express.json({ limit: '1mb' }));

// ---------- multer ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ---------- routes (mounted at /api/samsub/kyc/* by Vercel) ----------

app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Sumsub KYC API',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.post('/create-applicant', async (req, res) => {
  try {
    const { externalUserId, levelName, email, firstName, lastName, phone } = req.body;
    if (!externalUserId || !levelName) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Missing required fields',
        required: ['externalUserId', 'levelName']
      }));
    }
    if (email && !helpers.isValidEmail(email)) {
      return res.status(400).json(helpers.formatResponse(false, null, { message: 'Invalid email format' }));
    }
    if (phone && !helpers.isValidPhone(phone)) {
      return res.status(400).json(helpers.formatResponse(false, null, { message: 'Invalid phone format' }));
    }
    helpers.logRequest(req, '/create-applicant');
    const applicant = await samsubService.createApplicant({ externalUserId, levelName, email, firstName, lastName, phone });
    res.json(helpers.formatResponse(true, applicant));
  } catch (error) {
    return helpers.handleError(res, error, 'Failed to create applicant', 'Create applicant error:');
  }
});

app.post('/upload-document', upload.single('document'), async (req, res) => {
  try {
    const { applicantId, documentType } = req.body;
    const file = req.file;
    if (!applicantId || !documentType || !file) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Missing required fields',
        required: ['applicantId', 'documentType', 'document (file)']
      }));
    }
    if (!helpers.isValidDocumentType(file.originalname)) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Invalid file type. Allowed: jpg, jpeg, png, pdf'
      }));
    }
    helpers.logRequest(req, '/upload-document');
    const sanitizedFilename = helpers.sanitizeFilename(file.originalname);
    const result = await samsubService.uploadDocument(applicantId, {
      documentType,
      fileName: sanitizedFilename,
      fileBuffer: file.buffer,
      mimeType: file.mimetype
    });
    res.json(helpers.formatResponse(true, result));
  } catch (error) {
    return helpers.handleError(res, error, 'Failed to upload document', 'Upload document error:');
  }
});

app.get('/status/:applicantId', async (req, res) => {
  try {
    const { applicantId } = req.params;
    if (!applicantId) return res.status(400).json(helpers.formatResponse(false, null, { message: 'Applicant ID is required' }));
    helpers.logRequest(req, `/status/${applicantId}`);
    const status = await samsubService.getApplicantStatus(applicantId);
    res.json(helpers.formatResponse(true, status));
  } catch (error) {
    return helpers.handleError(res, error, 'Failed to get applicant status', 'Get status error:');
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const raw = req.body; // Buffer (express.raw())
    const signature = req.headers['x-payload-digest'];
    const alg = (req.headers['x-payload-digest-alg'] || 'sha256').toLowerCase();

    const isValid = samsubService.verifyWebhookSignature(raw, signature, alg);
    if (!isValid) {
      return res.status(401).json(helpers.formatResponse(false, null, { message: 'Invalid webhook signature' }));
    }

    const payload = JSON.parse(raw.toString('utf8'));
    helpers.logRequest(req, '/webhook');
    console.log('Webhook type:', helpers.parseWebhookType(payload));

    switch (payload.type) {
      case 'applicantReviewed':
        console.log(`Applicant ${payload.applicantId} reviewed: ${payload.reviewStatus}`);
        break;
      case 'applicantPending':
        console.log(`Applicant ${payload.applicantId} is pending review`);
        break;
      case 'applicantActionPending':
        console.log(`Applicant ${payload.applicantId} requires action`);
        break;
      default:
        console.log(`Unknown webhook type: ${payload.type}`);
    }

    return res.json(helpers.formatResponse(true, { received: true }));
  } catch (error) {
    return helpers.handleError(res, error, 'Failed to process webhook', 'Webhook error:');
  }
});

app.post('/access-token', async (req, res) => {
  try {
    const { applicantId, levelName } = req.body;
    if (!applicantId) return res.status(400).json(helpers.formatResponse(false, null, { message: 'Applicant ID is required' }));
    helpers.logRequest(req, '/access-token');
    const token = await samsubService.generateAccessToken(applicantId, levelName);
    res.json(helpers.formatResponse(true, { token }));
  } catch (error) {
    return helpers.handleError(res, error, 'Failed to generate access token', 'Access token error:');
  }
});

app.get('/generate-user-id', (req, res) => {
  try {
    const { prefix } = req.query;
    const userId = helpers.generateExternalUserId(prefix);
    res.json(helpers.formatResponse(true, { externalUserId: userId }));
  } catch (error) {
    return helpers.handleError(res, error, 'Failed to generate user ID', 'Generate user ID error:');
  }
});

app.post('/websdk-link', async (req, res) => {
  try {
    const { applicantId, externalUserId, levelName = 'basic-kyc-level' } = req.body;
    if (!applicantId && !externalUserId) {
      return res.status(400).json(helpers.formatResponse(false, null, { message: 'Either applicantId or externalUserId is required' }));
    }
    helpers.logRequest(req, '/websdk-link');
    const linkData = await samsubService.generateWebSDKLink({ applicantId, externalUserId, levelName });
    res.json(helpers.formatResponse(true, linkData));
  } catch (error) {
    return helpers.handleError(res, error, 'Failed to generate WebSDK link', 'WebSDK link error:');
  }
});

app.post('/init-automated', async (req, res) => {
  try {
    const { externalUserId, levelName = 'basic-kyc-level', email, firstName, lastName, phone } = req.body;
    if (!externalUserId) {
      return res.status(400).json(helpers.formatResponse(false, null, { message: 'External user ID is required' }));
    }
    helpers.logRequest(req, '/init-automated');
    const applicant = await samsubService.createApplicant({ externalUserId, levelName, email, firstName, lastName, phone });
    const accessToken = await samsubService.generateAccessToken(applicant.id, levelName);
    const webSDKLink = await samsubService.generateWebSDKLink({ applicantId: applicant.id, externalUserId, levelName, email, phone });
    res.json(helpers.formatResponse(true, {
      applicant,
      accessToken,
      webSDKLink,
      instructions: {
        message: 'Automated verification initialized successfully',
        nextSteps: [
          'Open the webSDKLink',
          'Auto-capture documents',
          'Wait for OCR + checks',
          'Track via webhook or polling'
        ]
      }
    }));
  } catch (error) {
    return helpers.handleError(res, error, 'Failed to initialize automated verification', 'Init automated error:');
  }
});

app.get('/levels', async (req, res) => {
  try {
    helpers.logRequest(req, '/levels');
    const levels = await samsubService.getApplicantLevels();
    res.json(helpers.formatResponse(true, levels));
  } catch (error) {
    return helpers.handleError(res, error, 'Failed to get verification levels', 'Get levels error:');
  }
});

app.post('/request-check', async (req, res) => {
  try {
    const { applicantId } = req.body;
    if (!applicantId) return res.status(400).json(helpers.formatResponse(false, null, { message: 'Applicant ID is required' }));
    helpers.logRequest(req, '/request-check');
    const result = await samsubService.requestApplicantCheck(applicantId);
    res.json(helpers.formatResponse(true, result));
  } catch (error) {
    return helpers.handleError(res, error, 'Failed to request applicant check', 'Request check error:');
  }
});

app.get('/applicant/:applicantId', async (req, res) => {
  try {
    const { applicantId } = req.params;
    if (!applicantId) return res.status(400).json(helpers.formatResponse(false, null, { message: 'Applicant ID is required' }));
    helpers.logRequest(req, `/applicant/${applicantId}`);
    const data = await samsubService.getApplicantData(applicantId);
    res.json(helpers.formatResponse(true, data));
  } catch (error) {
    return helpers.handleError(res, error, 'Failed to get applicant data', 'Get applicant data error:');
  }
});

app.post('/reset', async (req, res) => {
  try {
    const { applicantId } = req.body;
    if (!applicantId) return res.status(400).json(helpers.formatResponse(false, null, { message: 'Applicant ID is required' }));
    helpers.logRequest(req, '/reset');
    const result = await samsubService.resetApplicant(applicantId);
    res.json(helpers.formatResponse(true, result));
  } catch (error) {
    return helpers.handleError(res, error, 'Failed to reset applicant', 'Reset applicant error:');
  }
});

// Export for Vercel (Node runtime, not Edge)
module.exports = (req, res) => serverless(app)(req, res);
module.exports.config = { runtime: 'nodejs20.x' };
