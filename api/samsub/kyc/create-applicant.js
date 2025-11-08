const samsubService = require('../samsubService');

// Helper function to validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to validate phone
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{7,15}$/;
  return phoneRegex.test(phone);
};

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
    const { externalUserId, levelName, email, firstName, lastName, phone } = req.body;

    // Validation
    if (!externalUserId || !levelName) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          required: ['externalUserId', 'levelName']
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid email format' },
        timestamp: new Date().toISOString()
      });
    }

    // Validate phone if provided
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid phone format' },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[${new Date().toISOString()}] POST /create-applicant`);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const applicant = await samsubService.createApplicant({
      externalUserId,
      levelName,
      email,
      firstName,
      lastName,
      phone
    });

    res.json({
      success: true,
      data: applicant,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create applicant error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create applicant',
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};
