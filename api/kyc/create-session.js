// Vercel Edge Function: Create KYC Session
// Path: /api/kyc/create-session
// Completely serverless - no Node.js dependencies

export const config = { runtime: 'edge' };

function randomString(len = 16) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

function json(res, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export default async function handler(req) {
  // CORS preflight
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
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const {
      userId,
      email,
      phone,
      metadata,
      returnTo,       // optional: page to bounce user back to after KYC
      forceNew = false // optional: force a brand-new vendor_data each call
    } = body || {};

    if (!userId || !email) {
      return json({ error: 'userId and email are required' }, 400);
    }

    // Fallback return target from headers if not provided
    const referer = req.headers.get('referer') || req.headers.get('origin') || null;

    const nowIso = new Date().toISOString();
    const attemptId = (crypto.randomUUID && crypto.randomUUID()) || randomString(24);

    console.log(`[KYC] Creating session for user: ${userId}, forceNew=${!!forceNew}`);

    const API_KEY = process.env.DIDIT_API_KEY;
    const WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;
    const BASE_URL = 'https://verification.didit.me';

    // Test mode if env not set
    if (!API_KEY || !WORKFLOW_ID) {
      console.warn('[KYC] ⚠️ Didit not configured, returning test response');
      return json({
        mode: 'TEST',
        success: true,
        sessionId: `test-${Date.now()}`,
        message: 'Test mode: Configure DIDIT_API_KEY and DIDIT_WORKFLOW_ID in Vercel environment variables',
        userId,
        email,
        returnTo: returnTo || referer
      });
    }

    // Stable vendor_data by default so Didit may re-use active sessions for the same user.
    // If you truly want a fresh session per click, pass forceNew=true.
    const vendorData = forceNew ? `${userId}#${nowIso}` : userId;

    // Build payload with traceable metadata
    const payload = {
      workflow_id: WORKFLOW_ID,
      vendor_data: vendorData,
      callback: 'https://www.thealgohive.com/settings.html#kyc',
      metadata: {
        ...(metadata || {}),
        baseUserId: userId,
        attemptId,
        attempted_at: nowIso,
        returnTo: returnTo || referer || null
      },
      contact_details: {
        email,
        email_lang: 'en',
        phone: phone || undefined
      }
    };

    const response = await fetch(`${BASE_URL}/v2/session/`, {
      method: 'POST',
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json',
        // If Didit supports it, this can help with safe retries:
        // 'Idempotency-Key': attemptId,
      },
      body: JSON.stringify(payload)
    });

    const sessionData = await response.json();
    if (!response.ok) {
      console.error('[KYC] ❌ Didit API error:', sessionData);
      throw new Error(sessionData?.message || 'Failed to create session with Didit');
    }

    console.log(`[KYC] ✅ Session created: ${sessionData.session_id}`);

    return json({
      success: true,
      sessionId: sessionData.session_id,
      sessionUrl: sessionData.url,
      status: sessionData.status,
      mode: 'PRODUCTION',
      returnTo: returnTo || referer || null,
      reused: !forceNew && vendorData === userId ? true : false // hint for the client
    });

  } catch (error) {
    console.error('[KYC] ❌ Error creating session:', error);
    return json({
      error: 'Failed to create KYC session',
      details: error?.message || String(error)
    }, 500);
  }
}
