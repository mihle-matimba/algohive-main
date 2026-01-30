// api/samsub/kyc/status/[applicantId].js
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUMSUB_BASE = process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com';
const APP_TOKEN   = process.env.SUMSUB_APP_TOKEN;
const SECRET      = process.env.SUMSUB_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aazofjsssobejhkyyiqv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_ANON_KEY;

function sign(ts, method, path, body = '') {
  const toSign = String(ts) + method.toUpperCase() + path + body;
  return crypto.createHmac('sha256', SECRET).update(toSign).digest('hex');
}

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

function buildKycPayload(partial = {}) {
  const allowed = new Set([
    'id',
    'updated_at',
    'kyc_status',
    'kyc_reference',
    'kyc_applicant_id',
    'kyc_external_user_id',
    'kyc_started_at',
    'kyc_verified_at',
    'samsub_status',
    'samsub_external_user_id',
    'samsub_applicant_id',
    'samsub_websdk_url',
    'samsub_last_updated',
  ]);
  return Object.entries(partial).reduce((acc, [key, value]) => {
    if (allowed.has(key) && typeof value !== 'undefined') acc[key] = value;
    return acc;
  }, {});
}

function normalizeToken(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed.toLowerCase() : null;
  }
  return null;
}

function deriveSamsubOutcome(payload) {
  const primaryTokens = [
    normalizeToken(payload?.reviewResult?.reviewAnswer),
    normalizeToken(payload?.reviewResult?.reviewStatus),
    normalizeToken(payload?.reviewStatus),
    normalizeToken(payload?.status),
    normalizeToken(payload?.action),
    normalizeToken(payload?.reason),
  ].filter(Boolean);

  const successTokens = [
    'green',
    'approved',
    'completed',
    'complete',
    'finished',
    'accepted',
    'verified',
    'clear',
    'success',
    'pass',
    'passed',
  ];
  const failureTokens = ['red', 'reject', 'declin', 'failed', 'fraud', 'expired', 'denied', 'refused'];

  const isSuccess = primaryTokens.some((token) => successTokens.some((success) => token.includes(success)));
  const isFailure = primaryTokens.some((token) => failureTokens.some((fail) => token.includes(fail)));

  if (isSuccess) return 'complete';
  if (isFailure) return 'failed';
  return 'pending';
}

function extractExternalUserId(payload) {
  const candidates = [
    payload?.externalUserId,
    payload?.external_user_id,
    payload?.userId,
    payload?.user_id,
    payload?.clientId,
    payload?.client_id,
    payload?.customerId,
    payload?.customer_id,
    payload?.applicant?.externalUserId,
    payload?.applicant?.external_user_id,
    payload?.applicant?.userId,
    payload?.applicant?.user_id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

async function resolveProfileId(supabase, applicantId, externalUserId) {
  if (externalUserId) return externalUserId;
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .or(`samsub_applicant_id.eq.${applicantId},kyc_reference.eq.${applicantId},kyc_applicant_id.eq.${applicantId}`)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('Supabase lookup failed', error.message);
    return null;
  }
  return data?.id || null;
}

async function persistSamsubStatus({ applicantId, externalUserId, statusPayload }) {
  const supabase = getSupabaseClient();
  if (!supabase) return { saved: false, reason: 'Supabase credentials are not configured.' };

  const profileId = await resolveProfileId(supabase, applicantId, externalUserId);
  if (!profileId) return { saved: false, reason: 'No matching profile found.' };

  const now = new Date().toISOString();
  const outcome = deriveSamsubOutcome(statusPayload);
  const payload = buildKycPayload({
    id: profileId,
    updated_at: now,
    samsub_status: outcome,
    samsub_last_updated: now,
    samsub_applicant_id: applicantId,
    samsub_external_user_id: externalUserId || undefined,
    kyc_status: outcome === 'complete' ? 'complete' : outcome === 'failed' ? 'failed' : 'pending',
    kyc_reference: applicantId,
    kyc_applicant_id: applicantId,
    kyc_external_user_id: externalUserId || undefined,
    kyc_verified_at: outcome === 'complete' ? now : undefined,
  });

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });
  if (error) {
    return { saved: false, reason: error.message };
  }
  return { saved: true, status: outcome };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ error: 'Method not allowed' });
  }

  if (!APP_TOKEN || !SECRET) {
    return res
      .status(500)
      .json({ error: 'Sumsub credentials are not configured' });
  }

  const { applicantId } = req.query || {};
  const rawId = Array.isArray(applicantId) ? applicantId[0] : applicantId;
  const normalizedId =
    typeof rawId === 'string' ? rawId.trim() : String(rawId || '');

  if (!normalizedId) {
    return res
      .status(400)
      .json({ error: 'applicantId required' });
  }

  try {
    // 👉 use /one instead of /status
    const path = `/resources/applicants/${encodeURIComponent(
      normalizedId,
    )}/one`;
    const url = `${SUMSUB_BASE}${path}`;
    const ts = Math.floor(Date.now() / 1000);

    const sig = sign(ts, 'GET', path);

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        'X-App-Token': APP_TOKEN,
        'X-App-Access-Ts': String(ts),
        'X-App-Access-Sig': sig,
      },
    });

    const text = await r.text();
    let raw;
    try {
      raw = text ? JSON.parse(text) : {};
    } catch (error) {
      raw = { raw: text };
    }

    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: 'Sumsub error', data: raw });
    }

    // 🧠 Normalise the shape so your existing frontend
    // resolveSamsubState() keeps working:
    // - statusPayload.reviewResult.reviewAnswer -> 'GREEN' / 'RED'
    // - statusPayload.reviewStatus -> 'completed' / 'pending' / etc
    const review = raw.review || {};
    const normalized = {
      ...raw,
      reviewStatus: raw.reviewStatus || review.reviewStatus || null,
      reviewResult: raw.reviewResult || review.reviewResult || null,
    };

    const externalUserId = extractExternalUserId(normalized);
    await persistSamsubStatus({
      applicantId: normalizedId,
      externalUserId,
      statusPayload: normalized,
    });

    return res.status(200).json(normalized);
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ error: e.message });
  }
}
