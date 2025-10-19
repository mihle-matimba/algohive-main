// retrying to see if vercel will detect enviroment variables 

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, phone, metadata } = req.body;

    // Validate required fields
    if (!userId || !email) {
      return res.status(400).json({
        error: 'userId and email are required'
      });
    }

    console.log(`[KYC] Creating session for user: ${userId}`);

    // Get environment variables
    const API_KEY = process.env.DIDIT_API_KEY;
    const WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;
    const BASE_URL = 'https://verification.didit.me';

    // Check if Didit is configured
    if (!API_KEY || !WORKFLOW_ID) {
      console.warn('[KYC] ⚠️  Didit not configured, returning test response');
      
      // Return test mode response
      return res.status(200).json({
        mode: 'TEST',
        success: true,
        sessionId: `test-${Date.now()}`,
        message: 'Test mode: Configure DIDIT_API_KEY and DIDIT_WORKFLOW_ID in Vercel environment variables',
        userId,
        email
      });
    }

    // Create session with Didit API
    const response = await fetch(`${BASE_URL}/v2/session/`, {
      method: 'POST',
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflow_id: WORKFLOW_ID,
        vendor_data: userId,
        metadata: metadata || {},
        contact_details: {
          email: email,
          email_lang: 'en',
          phone: phone || undefined
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[KYC] ❌ Didit API error:', errorData);
      throw new Error(errorData.message || 'Failed to create session with Didit');
    }

    const sessionData = await response.json();

    console.log(`[KYC] ✅ Session created: ${sessionData.session_id}`);

    // Return session data
    res.status(200).json({
      success: true,
      sessionId: sessionData.session_id,
      sessionUrl: sessionData.url,
      status: sessionData.status,
      mode: 'PRODUCTION'
    });

  } catch (error) {
    console.error('[KYC] ❌ Error creating session:', error);
    res.status(500).json({
      error: 'Failed to create KYC session',
      details: error.message
    });
  }
}
