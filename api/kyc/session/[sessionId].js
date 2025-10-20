// Vercel Serverless Function: Get KYC Session Status
// Path: /api/kyc/session/[sessionId]

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    console.log(`[KYC] Fetching session status: ${sessionId}`);

    // Get environment variables
    const API_KEY = process.env.DIDIT_API_KEY;
    const BASE_URL = 'https://verification.didit.me';

    // Check if it's a test session
    if (sessionId.startsWith('test-')) {
      console.log('[KYC] Test session detected');
      return res.status(200).json({
        success: true,
        mode: 'TEST',
        sessionId: sessionId,
        status: 'Not Started',
        message: 'Test session - configure Didit API for production'
      });
    }

    if (!API_KEY) {
      console.warn('[KYC] ⚠️  Didit not configured');
      return res.status(500).json({
        error: 'Didit API not configured'
      });
    }

    // Fetch session from Didit API
    const response = await fetch(
      `${BASE_URL}/v2/session/${sessionId}/decision/`,
      {
        headers: {
          'X-Api-Key': API_KEY
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[KYC] ❌ Didit API error:', errorData);
      throw new Error(errorData.message || 'Failed to fetch session');
    }

    const sessionData = await response.json();

    console.log(`[KYC] ✅ Session status: ${sessionData.status || 'unknown'}`);

    res.status(200).json({
      success: true,
      sessionId: sessionId,
      status: sessionData.status,
      details: sessionData
    });

  } catch (error) {
    console.error('[KYC] ❌ Error fetching session:', error);
    res.status(500).json({
      error: 'Failed to fetch session status',
      details: error.message
    });
  }
}

