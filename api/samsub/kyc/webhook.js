const samsubService = require('../samsubService');

// Helper function to parse webhook type
const parseWebhookType = (payload) => {
  const typeMap = {
    'applicantReviewed': 'Applicant verification completed',
    'applicantPending': 'Applicant pending review',
    'applicantActionPending': 'Applicant action required',
    'applicantOnHold': 'Applicant on hold',
    'applicantActionOnHold': 'Applicant action on hold'
  };
  
  return typeMap[payload.type] || `Unknown webhook type: ${payload.type}`;
};

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-payload-digest');

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
    const payload = req.body;
    const signature = req.headers['x-payload-digest'];

    // Verify webhook signature
    const isValid = samsubService.verifyWebhookSignature(payload, signature);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid webhook signature' },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[${new Date().toISOString()}] POST /webhook`);
    console.log('Webhook received:', JSON.stringify(payload, null, 2));
    console.log('Webhook type:', parseWebhookType(payload));

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

    res.json({
      success: true,
      data: { received: true },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process webhook',
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};
