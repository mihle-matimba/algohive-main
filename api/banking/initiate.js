const { createClient } = require('@supabase/supabase-js');
const truIDClient = require('../../services/truidClient');

const REQUIRED_ENV = ['TRUID_API_KEY', 'TRUID_API_BASE', 'COMPANY_ID', 'BRAND_ID', 'WEBHOOK_URL', 'REDIRECT_URL'];
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aazofjsssobejhkyyiqv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhem9manNzc29iZWpoa3l5aXF2IiwiY3JvbGUiOiJhbm9uIiwiaWF0IjoxNzU4MTEyNTQ1LCJleHAiOjIwNzM2ODg1NDV9.guYlxaV5RwTlTVFoUhpER0KWEIGPay8svLsxMwyRUyM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function respondMissingEnv(res) {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (!missing.length) return false;
  res.status(500).json({
    success: false,
    error: `Missing required environment variables: ${missing.join(', ')}`
  });
  return true;
}

function parseBody(req) {
  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }
  return body || {};
}

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (respondMissingEnv(res)) return;

  const body = parseBody(req);
  const {
    idType = process.env.TEST_ID_TYPE || 'id',
    provider = process.env.TEST_PROVIDER,
    accounts,
    auto,
    rememberMe = process.env.TEST_REMEMBER_ME,
    consentId,
    services,
    correlation,
    force
  } = body || {};

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  if (!accessToken) {
    return res.status(401).json({ success: false, error: 'Missing bearer token' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user?.id) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session', details: userError?.message });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name,last_name,id_number,phone,email,email_address')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) {
    return res.status(404).json({ success: false, error: 'Profile not found' });
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  const idNumber = profile.id_number ? String(profile.id_number).trim() : '';
  const email = profile.email || profile.email_address || '';
  const mobile = profile.phone || '';

  if (!fullName || !idNumber) {
    return res.status(400).json({ success: false, error: 'Profile missing required fields', required: ['first_name', 'last_name', 'id_number'] });
  }

  try {
    const collection = await truIDClient.createCollection({
      name: fullName,
      idNumber,
      idType,
      email,
      mobile,
      provider,
      accounts,
      auto,
      rememberMe,
      consentId,
      services,
      correlation,
      force
    });
    res.status(201).json({
      success: true,
      collectionId: collection.collectionId,
      consumerUrl: collection.consumerUrl,
      consentId: collection.consentId
    });
  } catch (error) {
    console.error('Error creating collection', error.message);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};
