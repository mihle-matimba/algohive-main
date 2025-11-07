// Serverless function for SamSub KYC API
require('dotenv').config();
const express = require('express');
const kycRouter = require('./samsub/kyc');

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount the router at root since Vercel routing already handles the path prefix
app.use('/', kycRouter);

// Export as serverless function
module.exports = app;
