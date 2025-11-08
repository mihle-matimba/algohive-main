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
    const { applicantId, levelName } = req.body;

    if (!applicantId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Applicant ID is required' },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[${new Date().toISOString()}] POST /access-token`);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const token = await samsubService.generateAccessToken(applicantId, levelName);

    res.json({
      success: true,
      data: { token },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Access token error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate access token',
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};
