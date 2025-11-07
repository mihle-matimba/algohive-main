// KYC API endpoint - proxies to SamSub service
require('dotenv').config();
const express = require('express');
const kycRouter = require('./samsub/kyc');

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount the router at root
app.use('/', kycRouter);

// Export as serverless function
module.exports = app;
