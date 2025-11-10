const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const samsubService = require('../../samsubServices');

const app = express();
const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function timestamp() {
  return new Date().toISOString();
}

function sendSuccess(res, data = {}) {
  res.json({ success: true, data, timestamp: timestamp() });
}

function normalizeError(error, fallbackMessage = 'Request failed') {
  if (!error) {
    return { status: 500, message: fallbackMessage };
  }

  if (error.code === 'SAMSUB_CONFIG_MISSING') {
    return { status: 500, message: 'SamSub credentials are not configured on the server.' };
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return { status: 413, message: 'The uploaded document exceeds the 5MB limit.' };
  }

  if (error.response) {
    const { status, data } = error.response;
    const details = typeof data === 'object' ? data : undefined;
    const message =
      data?.error?.message ||
      data?.description ||
      data?.message ||
      data?.error_description ||
      error.message ||
      fallbackMessage;
    return { status: status || 502, message, details };
  }

  if (error.request) {
    return { status: 504, message: 'No response was received from SamSub. Please try again.' };
  }

  return {
    status: error.status || error.statusCode || 500,
    message: error.message || fallbackMessage,
  };
}

function sendError(res, error, fallbackMessage) {
  const normalized = normalizeError(error, fallbackMessage);
  res.status(normalized.status).json({
    success: false,
    error: { message: normalized.message, details: normalized.details },
    timestamp: timestamp(),
  });
}

function resolveApplicantId(applicant) {
  if (!applicant) return null;
  return (
    applicant.id ||
    applicant.applicantId ||
    applicant.applicant_id ||
    applicant?.applicant?.id ||
    applicant?.applicant?.applicantId ||
    null
  );
}

function buildAutomatedInstructions({ firstName } = {}) {
  const introName = firstName && typeof firstName === 'string' ? firstName.trim() : '';
  const friendlyName = introName ? `, ${introName}` : '';
  return {
    nextSteps: [
      'Open the secure SamSub link to start your identity verification.',
      `Follow the prompts to capture your ID and selfie${friendlyName}.`,
      'Return to this page and use “Check status” so we can confirm your approval.',
    ],
  };
}

async function ensureApplicant(payload) {
  try {
    const applicant = await samsubService.createApplicant(payload);
    return { applicant, created: true };
  } catch (error) {
    const status = error?.response?.status;
    if (status === 409 || status === 400) {
      const fallbackId =
        error?.response?.data?.id ||
        error?.response?.data?.applicantId ||
        error?.response?.data?.applicant_id ||
        null;
      if (fallbackId) {
        try {
          const existing = await samsubService.getApplicantData(fallbackId);
          return { applicant: existing, created: false };
        } catch (innerError) {
          throw innerError;
        }
      }
    }
    throw error;
  }
}

router.get('/health', (req, res) => {
  sendSuccess(res, {
    status: 'online',
    service: 'SamSub KYC API',
    environment: process.env.NODE_ENV || 'development',
  });
});

router.post('/webhook', express.raw({ type: '*/*', limit: '5mb' }), async (req, res) => {
  try {
    const rawBody = req.body;
    const signature = req.headers['x-payload-digest'];
    const alg = req.headers['x-payload-digest-alg'];
    const verified = samsubService.verifyWebhookSignature(rawBody, signature, alg);
    if (!verified) {
      return sendError(res, { status: 401, message: 'Invalid webhook signature' });
    }

    let payload = null;
    try {
      payload = rawBody && rawBody.length ? JSON.parse(rawBody.toString('utf8')) : null;
    } catch (parseError) {
      payload = null;
    }

    sendSuccess(res, {
      received: true,
      verified: true,
      payload,
    });
  } catch (error) {
    sendError(res, error, 'Failed to process webhook.');
  }
});

router.use(express.json({ limit: '1mb' }));
router.use(express.urlencoded({ extended: true }));

router.post('/create-applicant', async (req, res) => {
  try {
    const { externalUserId, levelName, email, firstName, lastName, phone } = req.body || {};
    if (!externalUserId) {
      return sendError(res, { status: 400, message: 'externalUserId is required.' });
    }

    const { applicant, created } = await ensureApplicant({
      externalUserId,
      levelName,
      email,
      firstName,
      lastName,
      phone,
    });

    sendSuccess(res, { applicant, created });
  } catch (error) {
    sendError(res, error, 'Failed to create applicant.');
  }
});

router.post('/upload-document', upload.single('document'), async (req, res) => {
  try {
    const { applicantId, documentType, country } = req.body || {};
    if (!applicantId) {
      return sendError(res, { status: 400, message: 'applicantId is required.' });
    }
    if (!req.file) {
      return sendError(res, { status: 400, message: 'Document file is required.' });
    }

    const result = await samsubService.uploadDocument(applicantId, {
      documentType,
      country,
      fileName: req.file.originalname,
      fileBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });

    sendSuccess(res, { upload: result });
  } catch (error) {
    sendError(res, error, 'Failed to upload document.');
  }
});

router.get('/status/:applicantId', async (req, res) => {
  try {
    const { applicantId } = req.params;
    if (!applicantId) {
      return sendError(res, { status: 400, message: 'applicantId is required.' });
    }
    const status = await samsubService.getApplicantStatus(applicantId);
    sendSuccess(res, status);
  } catch (error) {
    sendError(res, error, 'Failed to fetch applicant status.');
  }
});

router.post('/access-token', async (req, res) => {
  try {
    const { applicantId, levelName, ttlInSecs } = req.body || {};
    if (!applicantId) {
      return sendError(res, { status: 400, message: 'applicantId is required.' });
    }
    const token = await samsubService.generateAccessToken(applicantId, levelName, ttlInSecs);
    sendSuccess(res, token);
  } catch (error) {
    sendError(res, error, 'Failed to generate access token.');
  }
});

router.get('/generate-user-id', (req, res) => {
  sendSuccess(res, { userId: crypto.randomUUID() });
});

router.post('/websdk-link', async (req, res) => {
  try {
    const { applicantId, externalUserId, levelName, ttlInSecs, lang } = req.body || {};
    if (!applicantId && !externalUserId) {
      return sendError(res, {
        status: 400,
        message: 'Provide either applicantId or externalUserId to generate a WebSDK link.',
      });
    }
    const link = await samsubService.generateWebSDKLink({
      applicantId,
      externalUserId,
      levelName,
      ttlInSecs,
      lang,
    });
    sendSuccess(res, link);
  } catch (error) {
    sendError(res, error, 'Failed to generate WebSDK link.');
  }
});

router.post('/init-automated', async (req, res) => {
  try {
    const { externalUserId, levelName, email, firstName, lastName, phone, ttlInSecs, lang } = req.body || {};
    if (!externalUserId && !email) {
      return sendError(res, {
        status: 400,
        message: 'externalUserId is required to start verification.',
      });
    }

    const { applicant } = await ensureApplicant({
      externalUserId,
      levelName,
      email,
      firstName,
      lastName,
      phone,
    });

    const applicantId = resolveApplicantId(applicant);
    if (!applicantId) {
      return sendError(res, {
        status: 502,
        message: 'SamSub did not return an applicant reference.',
      });
    }

    const webSDKLink = await samsubService.generateWebSDKLink({
      applicantId,
      externalUserId,
      levelName,
      ttlInSecs,
      lang,
    });
    const accessToken = await samsubService.generateAccessToken(applicantId, levelName, ttlInSecs);

    const instructions = buildAutomatedInstructions({ firstName });

    sendSuccess(res, {
      applicant,
      applicantId,
      webSDKLink,
      accessToken,
      instructions,
    });
  } catch (error) {
    sendError(res, error, 'Failed to initialise automated verification.');
  }
});

router.get('/levels', async (req, res) => {
  try {
    const levels = await samsubService.getApplicantLevels();
    sendSuccess(res, levels);
  } catch (error) {
    sendError(res, error, 'Failed to fetch levels.');
  }
});

router.post('/request-check', async (req, res) => {
  try {
    const { applicantId } = req.body || {};
    if (!applicantId) {
      return sendError(res, { status: 400, message: 'applicantId is required.' });
    }
    const response = await samsubService.requestApplicantCheck(applicantId);
    sendSuccess(res, response);
  } catch (error) {
    sendError(res, error, 'Failed to request applicant check.');
  }
});

router.get('/applicant/:applicantId', async (req, res) => {
  try {
    const { applicantId } = req.params;
    if (!applicantId) {
      return sendError(res, { status: 400, message: 'applicantId is required.' });
    }
    const data = await samsubService.getApplicantData(applicantId);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, error, 'Failed to fetch applicant data.');
  }
});

router.post('/reset', async (req, res) => {
  try {
    const { applicantId } = req.body || {};
    if (!applicantId) {
      return sendError(res, { status: 400, message: 'applicantId is required.' });
    }
    const result = await samsubService.resetApplicant(applicantId);
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, error, 'Failed to reset applicant.');
  }
});

app.use(router);

module.exports = app;
module.exports.config = {
  api: {
    bodyParser: false,
  },
  runtime: 'nodejs20.x',
};
