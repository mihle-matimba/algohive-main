const { createClient } = require('@supabase/supabase-js');
const truIDClient = require('../../services/truidClient');

const REQUIRED_ENV = ['TRUID_API_KEY', 'TRUID_API_BASE', 'COMPANY_ID', 'BRAND_ID', 'WEBHOOK_URL', 'REDIRECT_URL'];
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aazofjsssobejhkyyiqv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhem9manNzc29iZWpoa3l5aXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTI1NDUsImV4cCI6MjA3MzY4ODU0NX0.guYlxaV5RwTlTVFoUhpER0KWEIGPay8svLsxMwyRUyM';
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
    force,
    name,
    firstName,
    lastName,
    surname,
    idNumber,
    id,
    email,
    mobile
  } = body || {};

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  console.log('[truID:initiate] auth header present:', Boolean(authHeader));

  let user = null;
  if (accessToken) {
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError) {
      console.warn('[truID:initiate] supabase auth warning', userError.message || userError);
      if (String(userError.message || '').toLowerCase().includes('invalid api key')) {
        return res.status(500).json({
          success: false,
          error: 'Server Supabase configuration error',
          details: 'Check SUPABASE_URL and SUPABASE_ANON_KEY on the server.'
        });
      }
    }
    user = userData?.user || null;
    if (user?.id) {
      console.log('[truID:initiate] user id', user.id);
    }
  }

  const meta = user?.user_metadata || {};
  const resolvedFirstName = firstName || body.first_name || meta.first_name || meta.firstName || '';
  const resolvedLastName = lastName || surname || body.last_name || meta.last_name || meta.lastName || '';
  const resolvedName = name || meta.full_name || meta.name || [resolvedFirstName, resolvedLastName].filter(Boolean).join(' ').trim();
  const resolvedIdNumber = idNumber || id || body.id_number || meta.id_number || meta.idNumber || '';
  const resolvedEmail = email || meta.email || user?.email || '';
  const resolvedMobile = mobile || meta.phone || user?.phone || '';

  if (!resolvedName || !resolvedIdNumber) {
    return res.status(400).json({
      success: false,
      error: 'Missing required identity fields',
      required: ['name', 'id_number']
    });
  }

  try {
    const collection = await truIDClient.createCollection({
      name: resolvedName,
      idNumber: String(resolvedIdNumber).trim(),
      idType,
      email: resolvedEmail,
      mobile: resolvedMobile,
      provider,
      accounts,
      auto,
      rememberMe,
      consentId,
      services,
      correlation,
      force
    });
    console.log('[truID:initiate] collection response', {
      collectionId: collection.collectionId,
      consentId: collection.consentId,
      consumerUrl: collection.consumerUrl
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
