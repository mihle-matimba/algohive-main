const path = require('path');
const express = require('express');

// Local-only defaults so `npm run dev` works out of the box.
process.env.EXPERIAN_MOCK = process.env.EXPERIAN_MOCK || 'true';
process.env.ALLOW_UNAUTH = process.env.ALLOW_UNAUTH || 'true';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

// Serve static site
app.use(express.static(path.join(__dirname, 'public')));

// Mount serverless handlers
const creditCheckHandler = require('./api/credit-check');
const mockModeHandler = require('./api/mock-mode');

app.all('/api/credit-check', (req, res) => creditCheckHandler(req, res));
app.all('/api/mock-mode', (req, res) => mockModeHandler(req, res));

function listenWithFallback(startPort, maxAttempts = 10) {
  const initialPort = Number(startPort);
  const basePort = Number.isFinite(initialPort) ? initialPort : 3000;

  let attempt = 0;

  const tryListen = (portToTry) => {
    const server = app.listen(portToTry, () => {
      console.log(`Dev server running on http://localhost:${portToTry}`);
      console.log('Open: /money/personal/credit-check.html');
      console.log(`Mock mode: EXperian=${process.env.EXPERIAN_MOCK}`);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && attempt < maxAttempts) {
        attempt += 1;
        const nextPort = basePort + attempt;
        console.warn(`Port ${portToTry} in use; trying ${nextPort}...`);
        tryListen(nextPort);
        return;
      }

      console.error('Failed to start dev server:', err);
      process.exit(1);
    });
  };

  tryListen(basePort);
}

listenWithFallback(process.env.PORT || 3000);
