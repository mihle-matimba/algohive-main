// Vercel Serverless Function: SamSub Init Automated KYC
// Path: /api/Samsub/init-automated
const samsubService = require('./samsubService');

// Helper function for consistent API responses
function formatResponse(success, data = null, error = null) {
  const response = { success };
  
  if (success && data) {
    response.data = data;
  }
  
  if (!success && error) {
    response.error = error;
  }
  
  response.timestamp = new Date().toISOString();
  
  return response;
}

// Generate random external user ID
function generateExternalUserId(prefix = 'user') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json(formatResponse(false, null, {
      message: 'Method not allowed'
    }));
  }

  try {
    const { externalUserId, levelName = 'test-level', email, firstName, lastName, phone } = req.body;

    if (!externalUserId) {
      return res.status(400).json(formatResponse(false, null, {
        message: 'External user ID is required'
      }));
    }

    console.log(`[SamSub] Init automated verification for: ${externalUserId}`);

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

    res.json(formatResponse(true, {
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
    res.status(500).json(formatResponse(false, null, {
      message: 'Failed to initialize automated verification',
      error: error.message
    }));
  }
}