// Vercel Edge Function: Create KYC Session
// Path: /api/kyc/create-session
// Completely serverless - no Node.js dependencies

export const config = {
  runtime: 'edge',
}

export default async function handler(req) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const body = await req.json();
    const { userId, email, phone, metadata } = body;

    // Validate required fields
    if (!userId || !email) {
      return new Response(JSON.stringify({
        error: 'userId and email are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
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
      return new Response(JSON.stringify({
        mode: 'TEST',
        success: true,
        sessionId: `test-${Date.now()}`,
        message: 'Test mode: Configure DIDIT_API_KEY and DIDIT_WORKFLOW_ID in Vercel environment variables',
        userId,
        email
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
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
    return new Response(JSON.stringify({
      success: true,
      sessionId: sessionData.session_id,
      sessionUrl: sessionData.url,
      status: sessionData.status,
      mode: 'PRODUCTION'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[KYC] ❌ Error creating session:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create KYC session',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}