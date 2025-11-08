module.exports = async (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    service: 'SamSub KYC API',
    environment: process.env.NODE_ENV || 'development'
  });
};
