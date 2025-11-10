const express = require('express');
const kycRouter = require('./samsub/kyc');

const app = express();

app.use('/api/samsub/kyc', kycRouter);

module.exports = app;
module.exports.config = { runtime: 'nodejs20.x' };
