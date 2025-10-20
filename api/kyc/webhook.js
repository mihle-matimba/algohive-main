
// Vercel Serverless Function: Didit Webhook Handler
// Path: /api/kyc/webhook
// Configure this URL in your Didit dashboard: https://your-domain.vercel.app/api/kyc/webhook

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Verify webhook signature
function verifyWebhookSignature(payload, signature, secret) {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    const computedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error);
    return false;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-signature'];
    const payload = req.body;

    const WEBHOOK_SECRET = process.env.DIDIT_WEBHOOK_SECRET_KEY;

    // Verify webhook signature for security
    if (WEBHOOK_SECRET && signature) {
      if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
        console.error('[Webhook] ⚠️  Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      console.warn('[Webhook] ⚠️  No signature verification (configure DIDIT_WEBHOOK_SECRET_KEY)');
    }

    console.log('[Webhook] 📨 Webhook received:', JSON.stringify(payload, null, 2));

    const {
      session_id,
      status,
      vendor_data, // This is the userId
      workflow_id,
      event_type
    } = payload;

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Webhook] ⚠️  Supabase not configured');
      return res.status(200).json({ received: true, warning: 'Database not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different event types
    if (event_type === 'status.updated') {
      console.log(`[Webhook] Status update for user ${vendor_data}: ${status}`);

      // Update user's KYC status in database
      switch (status) {
        case 'Approved':
          console.log(`[Webhook] ✅ KYC VERIFIED for user: ${vendor_data}`);
          
          await supabase
            .from('profiles')
            .update({
              kyc_status: 'verified',
              kyc_approved_at: new Date().toISOString(),
              kyc_session_id: session_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', vendor_data);

          break;

        case 'Rejected':
        case 'Declined':
          console.log(`[Webhook] ❌ KYC REJECTED for user: ${vendor_data}`);
          
          await supabase
            .from('profiles')
            .update({
              kyc_status: 'rejected',
              kyc_session_id: session_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', vendor_data);

          break;

        case 'In Review':
          console.log(`[Webhook] 🔍 KYC IN REVIEW for user: ${vendor_data}`);
          
          await supabase
            .from('profiles')
            .update({
              kyc_status: 'in_review',
              kyc_session_id: session_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', vendor_data);

          break;

        case 'In Progress':
          console.log(`[Webhook] ⏳ KYC IN PROGRESS for user: ${vendor_data}`);
          
          await supabase
            .from('profiles')
            .update({
              kyc_status: 'in_progress',
              kyc_session_id: session_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', vendor_data);

          break;

        default:
          console.log(`[Webhook] 📊 Status: ${status} for user: ${vendor_data}`);
      }
    } else if (event_type === 'data.updated') {
      console.log('[Webhook] 📝 KYC data updated:', session_id);
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ received: true, event_type, status });

  } catch (error) {
    console.error('[Webhook] ❌ Error processing webhook:', error);
    // Still return 200 to acknowledge receipt, but log the error
    res.status(200).json({ received: true, error: error.message });
  }
}
