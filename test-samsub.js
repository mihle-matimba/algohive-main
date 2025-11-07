// Test script to check SamSub connection
require('dotenv').config();
const samsubService = require('./api/samsub/samsubService');

async function testSamSubConnection() {
  console.log('Testing SamSub connection...');
  
  // Check environment variables
  console.log('Environment variables check:');
  console.log('SAMSUB_APP_TOKEN:', process.env.SAMSUB_APP_TOKEN ? 'Set ✅' : 'Missing ❌');
  console.log('SAMSUB_SECRET_KEY:', process.env.SAMSUB_SECRET_KEY ? 'Set ✅' : 'Missing ❌');
  console.log('SAMSUB_APP_ID:', process.env.SAMSUB_APP_ID ? 'Set ✅' : 'Missing ❌');
  console.log('SAMSUB_API_URL:', process.env.SAMSUB_API_URL || 'Using default: https://api.sumsub.com');
  
  try {
    // Test credentials validation
    console.log('\n1. Testing credentials validation...');
    samsubService.validateCredentials();
    console.log('✅ Credentials validation passed');
    
    // Test signature generation
    console.log('\n2. Testing signature generation...');
    const signature = samsubService.generateSignature('GET', '/test', '');
    console.log('✅ Signature generated:', {
      timestamp: signature.timestamp,
      signature: signature.signature.substring(0, 10) + '...'
    });
    
    // Test basic API call (get levels - this is a safe endpoint)
    console.log('\n3. Testing API call (get levels)...');
    const levels = await samsubService.getApplicantLevels();
    console.log('✅ API call successful:', levels);
    
    console.log('\n🎉 All tests passed! SamSub service is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Check if it's a credentials error
    if (error.code === 'SAMSUB_CREDENTIALS_MISSING') {
      console.log('\n🔧 Troubleshooting:');
      console.log('For Vercel deployment, you need to:');
      console.log('1. Go to your Vercel project dashboard');
      console.log('2. Navigate to Settings > Environment Variables');
      console.log('3. Add these variables:');
      console.log('   SAMSUB_APP_TOKEN = your_app_token_here');
      console.log('   SAMSUB_SECRET_KEY = your_secret_key_here');
      console.log('   SAMSUB_APP_ID = your_app_id_here');
      console.log('4. Redeploy your project');
    }
    
    // Try to parse JSON error for more details
    try {
      const errorObj = JSON.parse(error.message);
      console.log('\nDetailed error:', errorObj);
    } catch (e) {
      // Not a JSON error, show as is
      console.log('\nError details:', error);
    }
  }
}

// Run the test
testSamSubConnection().then(() => {
  console.log('\nTest completed.');
}).catch(error => {
  console.error('Test script error:', error);
});