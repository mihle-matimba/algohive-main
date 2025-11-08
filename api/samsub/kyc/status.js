const samsubService = require('../samsubService');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: { message: 'Method not allowed' },
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { applicantId } = req.query;

    if (!applicantId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Applicant ID is required' },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[${new Date().toISOString()}] GET /status?applicantId=${applicantId}`);

    const status = await samsubService.getApplicantStatus(applicantId);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get applicant status',
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};
