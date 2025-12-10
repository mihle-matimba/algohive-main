const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const KYC_BUCKET = process.env.KYC_BUCKET || 'kyc';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function buildSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

module.exports = (req, res) =>
  new Promise((resolve) => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
      return resolve();
    }

    const adminClient = buildSupabaseAdminClient();
    if (!adminClient) {
      res.status(500).json({ success: false, error: { message: 'Storage credentials are not configured' } });
      return resolve();
    }

    upload.single('file')(req, res, async (err) => {
      if (err) {
        res.status(400).json({ success: false, error: { message: err.message || 'Upload error' } });
        return resolve();
      }

      try {
        const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
        const label = (req.body?.label || '').toString().trim();
        const userId = (req.body?.userId || '').toString().trim();

        if (!token) return res.status(401).json({ success: false, error: { message: 'Missing auth token' } });
        if (!label) return res.status(400).json({ success: false, error: { message: 'Missing document label' } });
        if (!userId) return res.status(400).json({ success: false, error: { message: 'Missing user id' } });
        if (!req.file) return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });

        const { data: authUser, error: authErr } = await adminClient.auth.getUser(token);
        if (authErr || !authUser?.user) {
          return res.status(401).json({ success: false, error: { message: 'Invalid auth token' } });
        }
        if (authUser.user.id !== userId) {
          return res.status(403).json({ success: false, error: { message: 'Token does not match user' } });
        }

        const ext = (req.file.originalname.split('.').pop() || 'bin').toLowerCase();
        const path = `${userId}/kyc_${label}_${Date.now()}.${ext}`;

        const { error: upErr } = await adminClient.storage.from(KYC_BUCKET).upload(path, req.file.buffer, {
          upsert: true,
          cacheControl: '3600',
          contentType: req.file.mimetype || 'application/octet-stream',
        });

        if (upErr) {
          return res.status(400).json({ success: false, error: { message: upErr.message || 'Storage upload failed' } });
        }

        const { data: pub } = adminClient.storage.from(KYC_BUCKET).getPublicUrl(path);
        const publicUrl = pub?.publicUrl;

        if (!publicUrl) {
          return res.status(500).json({ success: false, error: { message: 'Could not create public URL' } });
        }

        return res.status(200).json({ success: true, publicUrl, path });
      } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message || 'Unexpected error' } });
      } finally {
        resolve();
      }
    });
  });

module.exports.config = { api: { bodyParser: false } };
