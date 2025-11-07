const express = require('express');
const multer = require('multer');
const samsubService = require('./samsubService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Helper functions (merged from utils/helpers.js)
const helpers = {
  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate phone number (basic validation)
   */
  isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{7,15}$/;
    return phoneRegex.test(phone);
  },

  /**
   * Sanitize filename for document uploads
   */
  sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9\.\-_]/g, '_');
  },

  /**
   * Get file extension from filename
   */
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  },

  /**
   * Validate document file type
   */
  isValidDocumentType(filename) {
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    const extension = this.getFileExtension(filename);
    return allowedExtensions.includes(extension);
  },

  /**
   * Format response for consistent API responses
   */
  formatResponse(success, data = null, error = null) {
    const response = { success };
    
    if (success && data) {
      response.data = data;
    }
    
    if (!success && error) {
      response.error = error;
    }
    
    response.timestamp = new Date().toISOString();
    
    return response;
  },

  /**
   * Generate random external user ID
   */
  generateExternalUserId(prefix = 'user') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  },

  /**
   * Parse SamSub webhook payload type
   */
  parseWebhookType(payload) {
    const typeMap = {
      'applicantReviewed': 'Applicant verification completed',
      'applicantPending': 'Applicant pending review',
      'applicantActionPending': 'Applicant action required',
      'applicantOnHold': 'Applicant on hold',
      'applicantActionOnHold': 'Applicant action on hold'
    };
    
    return typeMap[payload.type] || `Unknown webhook type: ${payload.type}`;
  },

  /**
   * Log request details for debugging
   */
  logRequest(req, endpoint) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${endpoint}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
  }
};

/**
 * Health check endpoint
 * GET /api/samsub/kyc/health
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    service: 'SamSub KYC API',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Create a new applicant
 * POST /api/samsub/kyc/create-applicant
 */
router.post('/create-applicant', async (req, res) => {
  try {
    const { externalUserId, levelName, email, firstName, lastName, phone } = req.body;

    // Validation
    if (!externalUserId || !levelName) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Missing required fields',
        required: ['externalUserId', 'levelName']
      }));
    }

    // Validate email if provided
    if (email && !helpers.isValidEmail(email)) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Invalid email format'
      }));
    }

    // Validate phone if provided
    if (phone && !helpers.isValidPhone(phone)) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Invalid phone format'
      }));
    }

    helpers.logRequest(req, '/create-applicant');

    const applicant = await samsubService.createApplicant({
      externalUserId,
      levelName,
      email,
      firstName,
      lastName,
      phone
    });

    res.json(helpers.formatResponse(true, applicant));

  } catch (error) {
    console.error('Create applicant error:', error);
    res.status(500).json(helpers.formatResponse(false, null, {
      message: 'Failed to create applicant',
      error: error.message
    }));
  }
});

/**
 * Upload document for KYC verification
 * POST /api/samsub/kyc/upload-document
 */
router.post('/upload-document', upload.single('document'), async (req, res) => {
  try {
    const { applicantId, documentType } = req.body;
    const file = req.file;

    // Validation
    if (!applicantId || !documentType || !file) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Missing required fields',
        required: ['applicantId', 'documentType', 'document (file)']
      }));
    }

    // Validate file type
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
    console.error('Upload document error:', error);
    res.status(500).json(helpers.formatResponse(false, null, {
      message: 'Failed to upload document',
      error: error.message
    }));
  }
});

/**
 * Get applicant verification status
 * GET /api/samsub/kyc/status/:applicantId
 */
router.get('/status/:applicantId', async (req, res) => {
  try {
    const { applicantId } = req.params;

    if (!applicantId) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Applicant ID is required'
      }));
    }

    helpers.logRequest(req, `/status/${applicantId}`);

    const status = await samsubService.getApplicantStatus(applicantId);

    res.json(helpers.formatResponse(true, status));

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json(helpers.formatResponse(false, null, {
      message: 'Failed to get applicant status',
      error: error.message
    }));
  }
});

/**
 * Handle SamSub webhooks
 * POST /api/samsub/kyc/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const signature = req.headers['x-payload-digest'];

    // Verify webhook signature
    const isValid = samsubService.verifyWebhookSignature(payload, signature);
    
    if (!isValid) {
      return res.status(401).json(helpers.formatResponse(false, null, {
        message: 'Invalid webhook signature'
      }));
    }

    helpers.logRequest(req, '/webhook');

    // Process webhook payload
    console.log('Webhook received:', JSON.stringify(payload, null, 2));
    console.log('Webhook type:', helpers.parseWebhookType(payload));

    // Handle different webhook types
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

    res.json(helpers.formatResponse(true, { received: true }));

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json(helpers.formatResponse(false, null, {
      message: 'Failed to process webhook',
      error: error.message
    }));
  }
});

/**
 * Get access token for SamSub SDK
 * POST /api/samsub/kyc/access-token
 */
router.post('/access-token', async (req, res) => {
  try {
    const { applicantId, levelName } = req.body;

    if (!applicantId) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Applicant ID is required'
      }));
    }

    helpers.logRequest(req, '/access-token');

    const token = await samsubService.generateAccessToken(applicantId, levelName);

    res.json(helpers.formatResponse(true, { token }));

  } catch (error) {
    console.error('Access token error:', error);
    res.status(500).json(helpers.formatResponse(false, null, {
      message: 'Failed to generate access token',
      error: error.message
    }));
  }
});

/**
 * Generate external user ID
 * GET /api/samsub/kyc/generate-user-id
 */
router.get('/generate-user-id', (req, res) => {
  try {
    const { prefix } = req.query;
    const userId = helpers.generateExternalUserId(prefix);
    
    res.json(helpers.formatResponse(true, { externalUserId: userId }));
  } catch (error) {
    console.error('Generate user ID error:', error);
    res.status(500).json(helpers.formatResponse(false, null, {
      message: 'Failed to generate user ID',
      error: error.message
    }));
  }
});

/**
 * Generate WebSDK link for automated verification
 * POST /api/samsub/kyc/websdk-link
 */
router.post('/websdk-link', async (req, res) => {
  try {
    const { applicantId, externalUserId, levelName = 'test-level' } = req.body;

    if (!applicantId && !externalUserId) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Either applicantId or externalUserId is required'
      }));
    }

    helpers.logRequest(req, '/websdk-link');

    const linkData = await samsubService.generateWebSDKLink({
      applicantId,
      externalUserId,
      levelName
    });

    res.json(helpers.formatResponse(true, linkData));

  } catch (error) {
    console.error('WebSDK link error:', error);
    res.status(500).json(helpers.formatResponse(false, null, {
      message: 'Failed to generate WebSDK link',
      error: error.message
    }));
  }
});

/**
 * Initialize automated verification flow
 * POST /api/samsub/kyc/init-automated
 */
router.post('/init-automated', async (req, res) => {
  try {
    const { externalUserId, levelName = 'test-level', email, firstName, lastName, phone } = req.body;

    if (!externalUserId) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'External user ID is required'
      }));
    }

    helpers.logRequest(req, '/init-automated');

    // 1. Create applicant
    const applicant = await samsubService.createApplicant({
      externalUserId,
      levelName,
      email,
      firstName,
      lastName,
      phone
    });

    // 2. Generate access token for SDK
    const accessToken = await samsubService.generateAccessToken(applicant.id, levelName);

    // 3. Generate WebSDK link using the proper external link endpoint
    const webSDKLink = await samsubService.generateWebSDKLink({
      applicantId: applicant.id,
      externalUserId,
      levelName,
      email,
      phone
    });

    res.json(helpers.formatResponse(true, {
      applicant,
      accessToken,
      webSDKLink,
      instructions: {
        message: 'Automated verification initialized successfully',
        nextSteps: [
          'Direct user to the webSDKLink for automated document scanning',
          'User will scan documents with camera (auto-capture)',
          'All data will be extracted automatically via OCR',
          'Monitor verification status via webhook or polling'
        ]
      }
    }));

  } catch (error) {
    console.error('Init automated error:', error);
    res.status(500).json(helpers.formatResponse(false, null, {
      message: 'Failed to initialize automated verification',
      error: error.message
    }));
  }
});

/**
 * Get available verification levels
 * GET /api/samsub/kyc/levels
 */
router.get('/levels', async (req, res) => {
  try {
    helpers.logRequest(req, '/levels');

    const levels = await samsubService.getApplicantLevels();

    res.json(helpers.formatResponse(true, levels));

  } catch (error) {
    console.error('Get levels error:', error);
    res.status(500).json(helpers.formatResponse(false, null, {
      message: 'Failed to get verification levels',
      error: error.message
    }));
  }
});

/**
 * Request applicant check (start verification process)
 * POST /api/samsub/kyc/request-check
 */
router.post('/request-check', async (req, res) => {
  try {
    const { applicantId } = req.body;

    if (!applicantId) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Applicant ID is required'
      }));
    }

    helpers.logRequest(req, '/request-check');

    const result = await samsubService.requestApplicantCheck(applicantId);

    res.json(helpers.formatResponse(true, result));

  } catch (error) {
    console.error('Request check error:', error);
    res.status(500).json(helpers.formatResponse(false, null, {
      message: 'Failed to request applicant check',
      error: error.message
    }));
  }
});

/**
 * Get applicant data (full profile information)
 * GET /api/samsub/kyc/applicant/:applicantId
 */
router.get('/applicant/:applicantId', async (req, res) => {
  try {
    const { applicantId } = req.params;

    if (!applicantId) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Applicant ID is required'
      }));
    }

    helpers.logRequest(req, `/applicant/${applicantId}`);

    const applicantData = await samsubService.getApplicantData(applicantId);

    res.json(helpers.formatResponse(true, applicantData));

  } catch (error) {
    console.error('Get applicant data error:', error);
    res.status(500).json(helpers.formatResponse(false, null, {
      message: 'Failed to get applicant data',
      error: error.message
    }));
  }
});

/**
 * Reset applicant for resubmission
 * POST /api/samsub/kyc/reset
 */
router.post('/reset', async (req, res) => {
  try {
    const { applicantId } = req.body;

    if (!applicantId) {
      return res.status(400).json(helpers.formatResponse(false, null, {
        message: 'Applicant ID is required'
      }));
    }

    helpers.logRequest(req, '/reset');

    const result = await samsubService.resetApplicant(applicantId);

    res.json(helpers.formatResponse(true, result));

  } catch (error) {
    console.error('Reset applicant error:', error);
    res.status(500).json(helpers.formatResponse(false, null, {
      message: 'Failed to reset applicant',
      error: error.message
    }));
  }
});

module.exports = router;