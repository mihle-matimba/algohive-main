const samsubService = require('../samsubService');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: { message: 'Method not allowed' },
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { externalUserId, levelName = 'test-level', email, firstName, lastName, phone } = req.body;

    if (!externalUserId) {
      return res.status(400).json({
        success: false,
        error: { message: 'External user ID is required' },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[${new Date().toISOString()}] POST /init-automated`);
    console.log('Body:', JSON.stringify(req.body, null, 2));

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

    // 3. Generate WebSDK link
    const webSDKLink = await samsubService.generateWebSDKLink({
      applicantId: applicant.id,
      externalUserId,
      levelName,
      email,
      phone
    });

    res.json({
      success: true,
      data: {
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
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Init automated error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to initialize automated verification',
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};
