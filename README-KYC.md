# SumSub KYC Integration - Complete Documentation

## Overview

This project implements a **native Vercel serverless KYC integration** using SumSub's API with **automated document verification** in popup windows.

## Architecture

```
project-root/
├── api/
│   └── samsub/
│       ├── samsubService.js           # SumSub API client class
│       └── kyc/
│           ├── init-automated.js      # Initialize verification (returns webSDKLink)
│           ├── status.js              # Check verification status
│           ├── health.js              # Health check endpoint
│           ├── create-applicant.js    # Create new applicant
│           ├── access-token.js        # Generate SDK access token
│           └── webhook.js             # Handle SumSub webhooks
├── public/
│   └── settings.html                  # Frontend with KYC button
├── package.json
├── vercel.json                        # Routing & CSP headers
└── .env.example                       # Environment variables template
```

## How It Works

### User Flow

1. **User clicks "Get Started" in settings.html (`#docs` tab)**
2. **Frontend calls** `POST /api/samsub/kyc/init-automated`
3. **Vercel routes** to `api/samsub/kyc/init-automated.js`
4. **Backend creates** applicant, generates access token, and returns `webSDKLink.url`
5. **Frontend opens** popup window with the SumSub verification URL
6. **User completes** verification in popup (auto-capture documents)
7. **Frontend polls** `GET /api/samsub/kyc/status?applicantId=xxx` every 5 seconds
8. **When approved**, updates Supabase profile and unlocks account setup

### API Routing

Vercel automatically routes requests:
- `POST /api/samsub/kyc/init-automated` → `api/samsub/kyc/init-automated.js`
- `GET /api/samsub/kyc/status?applicantId=xxx` → `api/samsub/kyc/status.js`
- `POST /api/samsub/kyc/webhook` → `api/samsub/kyc/webhook.js`
- `GET /api/samsub/kyc/health` → `api/samsub/kyc/health.js`

## Environment Variables

Add these to your Vercel project settings or `.env` file:

```bash
SAMSUB_APP_TOKEN=your_token_here
SAMSUB_SECRET_KEY=your_secret_here
SAMSUB_APP_ID=your_app_id_here
SAMSUB_API_URL=https://api.sumsub.com
```

**Get these from:** [SumSub Dashboard](https://cockpit.sumsub.com/) → Settings → App Tokens

## API Endpoints

### 1. Initialize Automated Verification
**POST** `/api/samsub/kyc/init-automated`

**Request:**
```json
{
  "externalUserId": "ah_user123_1234567890",
  "levelName": "test-level",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+27123456789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applicant": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "createdAt": "2024-01-15 10:30:00",
      "externalUserId": "ah_user123_1234567890"
    },
    "accessToken": "sbx:uJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "webSDKLink": {
      "url": "https://cockpit.sumsub.com/idensic/l/#/sbx_uJhbGciOiJIUzI...",
      "applicantId": "64f1a2b3c4d5e6f7g8h9i0j1",
      "expiresInSeconds": 1800,
      "type": "external_permalink"
    }
  }
}
```

### 2. Check Verification Status
**GET** `/api/samsub/kyc/status?applicantId=64f1a2b3c4d5e6f7g8h9i0j1`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "reviewStatus": "completed",
    "reviewResult": {
      "reviewAnswer": "GREEN"
    }
  }
}
```

**Review Statuses:**
- `init` - Just created
- `pending` - Under review
- `completed` - Review finished (check `reviewAnswer`)
- `onHold` - Needs more info

**Review Answers:**
- `GREEN` - Approved ✅
- `RED` - Rejected ❌
- `YELLOW` - Needs manual review ⚠️

### 3. Webhook Handler
**POST** `/api/samsub/kyc/webhook`

**Headers:**
```
x-payload-digest: sha256_signature_from_sumsub
Content-Type: application/json
```

**Webhook Types:**
- `applicantReviewed` - Verification completed
- `applicantPending` - Pending review
- `applicantActionPending` - Action required

Configure webhook URL in SumSub Dashboard:
```
https://your-domain.vercel.app/api/samsub/kyc/webhook
```

### 4. Health Check
**GET** `/api/samsub/kyc/health`

**Response:**
```json
{
  "status": "online",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "SamSub KYC API",
  "environment": "production"
}
```

## Frontend Integration (settings.html)

### KYC Button Handler

```javascript
const btnKycStart = document.getElementById("btn-kyc-start");

btnKycStart?.addEventListener("click", async () => {
  try {
    btnKycStart.disabled = true;
    btnKycStart.textContent = "Starting…";

    const externalUserId = `ah_${user.id}_${Date.now()}`;
    
    // 1. Initialize verification
    const resp = await fetch('/api/samsub/kyc/init-automated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalUserId,
        levelName: 'test-level',
        email: user.email,
        firstName: row?.first_name,
        lastName: row?.last_name,
        phone: row?.phone
      })
    });

    const data = await resp.json();
    if (!resp.ok || !data.success) {
      throw new Error(data?.error?.message || 'Failed to start KYC');
    }

    const applicantId = data.data.applicant?.id;
    
    // 2. Open verification in popup
    const verificationWindow = window.open(
      data.data.webSDKLink.url, 
      '_blank', 
      'width=800,height=900'
    );

    // 3. Poll for status every 5 seconds
    let pollCount = 0;
    const maxPolls = 60;
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      try {
        const statusResp = await fetch(
          `/api/samsub/kyc/status?applicantId=${applicantId}`
        );
        const statusData = await statusResp.json();
        
        if (statusData.success && statusData.data) {
          const reviewStatus = statusData.data.reviewStatus;
          const reviewResult = statusData.data.reviewResult;
          
          if (reviewStatus === 'completed' || 
              reviewResult?.reviewAnswer === 'GREEN') {
            clearInterval(pollInterval);
            
            // 4. Update Supabase
            await supabase.from('profiles').update({
              kyc_status: 'verified',
              kyc_approved_at: new Date().toISOString(),
              kyc_applicant_id: applicantId
            }).eq('id', user.id);
            
            // 5. Update UI
            setKycState(true);
            banner('🎉 KYC Approved!', 'ok');
            location.hash = '#manage'; // Redirect to account setup
          }
        }
      } catch (e) {
        console.warn('Status poll error:', e);
      }
      
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        banner('Verification taking longer than expected', 'warn');
      }
    }, 5000);

  } catch (e) {
    console.error(e);
    banner(e.message || 'Could not start KYC', 'err');
  } finally {
    btnKycStart.disabled = false;
    btnKycStart.textContent = "Get Started";
  }
});
```

## Content Security Policy (vercel.json)

The CSP headers are already configured to allow SumSub:

```json
{
  "version": 2,
  "cleanUrls": true,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "connect-src 'self' https://api.sumsub.com https://*.supabase.co; frame-src 'self' https://*.sumsub.com;"
        }
      ]
    }
  ]
}
```

**Key CSP directives:**
- `connect-src` - Allows AJAX calls to `https://api.sumsub.com`
- `frame-src` - Allows iframe/popup from `https://*.sumsub.com`

## SumSub Service Class (samsubService.js)

The service provides these methods:

```javascript
const samsubService = require('../samsub/samsubService');

// Create applicant
const applicant = await samsubService.createApplicant({
  externalUserId: 'ah_user123',
  levelName: 'test-level',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+27123456789'
});

// Generate access token for SDK
const token = await samsubService.generateAccessToken(
  applicantId, 
  'test-level'
);

// Generate WebSDK link for automated verification
const webSDKLink = await samsubService.generateWebSDKLink({
  applicantId,
  externalUserId: 'ah_user123',
  levelName: 'test-level',
  email: 'user@example.com',
  phone: '+27123456789'
});

// Get applicant status
const status = await samsubService.getApplicantStatus(applicantId);

// Verify webhook signature
const isValid = samsubService.verifyWebhookSignature(
  payload, 
  signature
);
```

## Database Schema (Supabase)

Add these columns to your `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_applicant_id TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_external_user_id TEXT DEFAULT NULL;
```

## Deployment Checklist

### 1. Set Environment Variables in Vercel
```bash
vercel env add SAMSUB_APP_TOKEN
vercel env add SAMSUB_SECRET_KEY
vercel env add SAMSUB_APP_ID
```

### 2. Configure SumSub Webhook
In [SumSub Dashboard](https://cockpit.sumsub.com/) → Settings → Webhooks:
- **Webhook URL:** `https://your-domain.vercel.app/api/samsub/kyc/webhook`
- **Events:** Select all applicant events

### 3. Test the Integration
```bash
# Health check
curl https://your-domain.vercel.app/api/samsub/kyc/health

# Initialize verification (requires auth)
curl -X POST https://your-domain.vercel.app/api/samsub/kyc/init-automated \
  -H "Content-Type: application/json" \
  -d '{
    "externalUserId": "test_user_123",
    "levelName": "test-level",
    "email": "test@example.com"
  }'
```

### 4. Monitor Logs
```bash
vercel logs --follow
```

## Troubleshooting

### "Failed to start KYC"
- ✅ Check environment variables are set in Vercel
- ✅ Verify SumSub credentials are correct
- ✅ Check SumSub account is active

### "Popup blocked"
- ✅ Browser is blocking popups - user needs to allow
- ✅ Add clear messaging: "Please allow popups to continue"

### "Status polling not working"
- ✅ Check applicantId is correct
- ✅ Verify `/api/samsub/kyc/status` endpoint is accessible
- ✅ Check browser console for errors

### Webhook not receiving events
- ✅ Verify webhook URL is publicly accessible
- ✅ Check SumSub Dashboard webhook configuration
- ✅ Test with `curl -X POST https://your-domain.vercel.app/api/samsub/kyc/webhook`

## Security Best Practices

1. **Never expose credentials in frontend code**
2. **Always verify webhook signatures** (implemented in `webhook.js`)
3. **Use HTTPS only** (Vercel enforces this)
4. **Validate input** on all endpoints
5. **Rate limit** API calls (use Vercel's built-in rate limiting)

## Testing Credentials

For development, SumSub provides sandbox credentials:
- Use level name: `test-level`
- Test documents are available in SumSub docs

## Support

- **SumSub Docs:** https://developers.sumsub.com/
- **SumSub Support:** support@sumsub.com
- **Vercel Docs:** https://vercel.com/docs

## License

This integration follows your project's license.
