const truIDClient = require('../../services/truidClient');

const REQUIRED_ENV = ['TRUID_API_KEY', 'TRUID_API_BASE', 'COMPANY_ID', 'BRAND_ID', 'WEBHOOK_URL', 'REDIRECT_URL'];

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
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

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (respondMissingEnv(res)) return;

  const collectionId = req.query?.collectionId;
  if (!collectionId) {
    return res.status(400).json({ success: false, error: 'Missing collectionId' });
  }

  try {
    const result = await truIDClient.getCollectionData(collectionId);
    res.json({ success: true, collectionId, data: result.data });
  } catch (error) {
    console.error('Error downloading collection data', error.message);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};
