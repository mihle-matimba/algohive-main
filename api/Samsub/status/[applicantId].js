// Vercel Serverless Function: SamSub Get Status
// Path: /api/Samsub/status/[applicantId]
const samsubService = require('../../Samsub/samsubService');

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

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json(formatResponse(false, null, {
      message: 'Method not allowed'
    }));
  }

  try {
    const { applicantId } = req.query;

    if (!applicantId) {
      return res.status(400).json(formatResponse(false, null, {
        message: 'Applicant ID is required'
      }));
    }

    console.log(`[SamSub] Getting status for applicant: ${applicantId}`);

    const status = await samsubService.getApplicantStatus(applicantId);

    res.json(formatResponse(true, status));

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json(formatResponse(false, null, {
      message: 'Failed to get applicant status',
      error: error.message
    }));
  }
}