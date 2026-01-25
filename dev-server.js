const path = require('path');
const express = require('express');
const cors = require('cors');

// Local-only defaults so `npm run dev` works out of the box.
process.env.EXPERIAN_MOCK = process.env.EXPERIAN_MOCK || 'false';
process.env.ALLOW_UNAUTH = process.env.ALLOW_UNAUTH || 'true';

// Temporary hardcoded TruID config (remove later).
process.env.TRUID_API_KEY = process.env.TRUID_API_KEY || '938d48454fe54f578c661507f9261208';
process.env.TRUID_API_BASE = process.env.TRUID_API_BASE || 'https://api.truidconnect.com';
process.env.TRUID_DOMAIN = process.env.TRUID_DOMAIN || 'truidconnect.com';
process.env.TRUID_SCHEME = process.env.TRUID_SCHEME || 'https';
process.env.COMPANY_ID = process.env.COMPANY_ID || 'g4s5350p33x4oqn97tkcuk29x';
process.env.BRAND_ID = process.env.BRAND_ID || '6tc5naj4qu7moee78771';
process.env.WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-project-alpha.vercel.app/api/webhooks/truid';
process.env.REDIRECT_URL = process.env.REDIRECT_URL || 'https://your-project-alpha.vercel.app/success';
process.env.PORT = process.env.PORT || '3000';

process.env.TEST_NAME = process.env.TEST_NAME || 'Joe Customer';
process.env.TEST_ID = process.env.TEST_ID || '8901015000111';
process.env.TEST_ID_TYPE = process.env.TEST_ID_TYPE || 'id';
process.env.TEST_ID_NATIONALITY = process.env.TEST_ID_NATIONALITY || 'za';
process.env.TEST_DATE_OF_BIRTH = process.env.TEST_DATE_OF_BIRTH || '1974-04-12';
process.env.TEST_GENDER = process.env.TEST_GENDER || 'm';
process.env.TEST_EMAIL = process.env.TEST_EMAIL || 'joe@consumer.co.za';
process.env.TEST_MOBILE = process.env.TEST_MOBILE || '0721234567';
process.env.TEST_PROVIDER = process.env.TEST_PROVIDER || 'livetestapi';
process.env.TEST_ACCOUNT_NUMBER = process.env.TEST_ACCOUNT_NUMBER || '33333';
process.env.TEST_ACCOUNT_NUMBER_SECONDARY =
  process.env.TEST_ACCOUNT_NUMBER_SECONDARY || '22222';
process.env.TEST_REMEMBER_ME = process.env.TEST_REMEMBER_ME || 'on';

const truIDClient = require('./services/truidClient');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const REQUIRED_ENV = [
  'TRUID_API_KEY',
  'TRUID_API_BASE',
  'COMPANY_ID',
  'BRAND_ID',
  'WEBHOOK_URL',
  'REDIRECT_URL'
];

function respondMissingEnv(res) {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (!missing.length) return false;
  res.status(500).json({
    success: false,
    error: `Missing required environment variables: ${missing.join(', ')}`
  });
  return true;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/banking/initiate', async (req, res) => {
  if (respondMissingEnv(res)) return;

  const {
    name = process.env.TEST_NAME,
    idNumber = process.env.TEST_ID,
    idType = process.env.TEST_ID_TYPE || 'id',
    email = process.env.TEST_EMAIL,
    mobile = process.env.TEST_MOBILE,
    provider = process.env.TEST_PROVIDER,
    accounts,
    auto,
    rememberMe = process.env.TEST_REMEMBER_ME,
    consentId,
    services,
    correlation,
    force
  } = req.body || {};

  if (!name || !idNumber) {
    return res.status(400).json({ success: false, error: 'Name and idNumber are required' });
  }

  try {
    const collection = await truIDClient.createCollection({
      name,
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
    console.log('✅ Collection created', {
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
});

app.get('/api/banking/status/:collectionId', async (req, res) => {
  if (respondMissingEnv(res)) return;

  try {
    const result = await truIDClient.getCollection(req.params.collectionId);
    const statusNode = result.data?.status || result.data?.current_status;
    const fallbackStatus = statusNode?.code || statusNode || result.data?.state;
    const currentStatus =
      fallbackStatus ||
      extractLatestStatus(result.data?.statuses) ||
      extractLatestMilestone(result.data?.milestones) ||
      'UNKNOWN';

    console.log('📡 Collection status check', {
      collectionId: req.params.collectionId,
      status: currentStatus,
      raw: result.data
    });

    res.json({
      success: true,
      collectionId: req.params.collectionId,
      currentStatus,
      raw: result.data
    });
  } catch (error) {
    console.error('Error fetching collection', error.message);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

function extractLatestStatus(statuses) {
  if (!Array.isArray(statuses) || !statuses.length) return null;
  const sorted = [...statuses].sort((a, b) => {
    const aTime = Date.parse(a?.time || a?.created || a?.timestamp || 0);
    const bTime = Date.parse(b?.time || b?.created || b?.timestamp || 0);
    return bTime - aTime;
  });
  const latest = sorted[0];
  return latest?.code || latest?.status || latest?.state || null;
}

function extractLatestMilestone(milestones) {
  if (!Array.isArray(milestones) || !milestones.length) return null;
  const sorted = [...milestones].sort((a, b) => {
    const aTime = Date.parse(a?.time || a?.created || a?.timestamp || 0);
    const bTime = Date.parse(b?.time || b?.created || b?.timestamp || 0);
    return bTime - aTime;
  });
  const latest = sorted[0];
  return latest?.code || latest?.status || latest?.state || latest?.name || null;
}

app.get('/api/banking/all/:collectionId', async (req, res) => {
  if (respondMissingEnv(res)) return;

  try {
    const result = await truIDClient.getCollectionData(req.params.collectionId);
    console.log('📦 Collection summary fetched', {
      collectionId: req.params.collectionId,
      data: result.data
    });
    res.json({ success: true, collectionId: req.params.collectionId, data: result.data });
  } catch (error) {
    console.error('Error downloading collection data', error.message);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

app.get('/connect/truid', async (req, res) => {
  if (respondMissingEnv(res)) return;

  const {
    name = process.env.TEST_NAME,
    idNumber = process.env.TEST_ID,
    idType = process.env.TEST_ID_TYPE || 'id',
    email = process.env.TEST_EMAIL,
    mobile = process.env.TEST_MOBILE,
    provider = process.env.TEST_PROVIDER,
    rememberMe = process.env.TEST_REMEMBER_ME
  } = req.query;

  try {
    const collection = await truIDClient.createCollection({
      name,
      idNumber,
      idType,
      email,
      mobile,
      provider,
      rememberMe
    });

    console.log('✅ Collection created (redirect)', {
      collectionId: collection.collectionId,
      consentId: collection.consentId,
      consumerUrl: collection.consumerUrl
    });

    if (!collection.consumerUrl) {
      return res.status(502).json({ success: false, error: 'Missing consumer URL from truID response' });
    }

    res.redirect(collection.consumerUrl);
  } catch (error) {
    console.error('Error auto-redirecting to truID', error.message);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

app.post('/api/webhooks/truid', (req, res) => {
  console.log('📬 truID webhook received', JSON.stringify(req.body, null, 2));
  res.status(200).json({ received: true });
});

app.get('/api/admin/collections/:collectionId', async (req, res) => {
  if (respondMissingEnv(res)) return;

  try {
    const [collection, data] = await Promise.all([
      truIDClient.getCollection(req.params.collectionId),
      truIDClient.getCollectionData(req.params.collectionId)
    ]);

    res.json({
      success: true,
      collectionId: req.params.collectionId,
      collection: collection.data,
      data: data.data
    });
  } catch (error) {
    console.error('Error fetching admin collection details', error.message);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// Mount serverless handlers that still exist in api/
const creditCheckHandler = require('./api/credit-check');
const mockModeHandler = require('./api/mock-mode');

app.all('/api/credit-check', (req, res) => creditCheckHandler(req, res));
app.all('/api/mock-mode', (req, res) => mockModeHandler(req, res));

// Fallback: dynamically load any /api/* handler from the api/ folder
app.all('/api/*', (req, res) => {
  const relativePath = req.path.replace(/^\/api\//, '');
  const handlerPath = path.join(__dirname, 'api', relativePath);

  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const handler = require(handlerPath);
    return handler(req, res);
  } catch (err) {
    if (err && (err.code === 'MODULE_NOT_FOUND' || err.code === 'ERR_MODULE_NOT_FOUND')) {
      return res.status(404).json({ error: 'API route not found', path: req.path });
    }

    console.error('API handler error:', err);
    return res.status(500).json({ error: 'API handler failed', path: req.path });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function listenWithFallback(startPort, maxAttempts = 10) {
  const initialPort = Number(startPort);
  const basePort = Number.isFinite(initialPort) ? initialPort : 3000;

  let attempt = 0;

  const tryListen = (portToTry) => {
    const server = app.listen(portToTry, () => {
      console.log(`Server running on http://localhost:${portToTry}`);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && attempt < maxAttempts) {
        attempt += 1;
        const nextPort = basePort + attempt;
        console.warn(`Port ${portToTry} in use; trying ${nextPort}...`);
        tryListen(nextPort);
        return;
      }

      console.error('Failed to start server:', err);
      process.exit(1);
    });
  };

  tryListen(basePort);
}

listenWithFallback(PORT);
