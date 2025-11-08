# Setting Up SumSub Environment Variables in Vercel

## The Error You're Seeing

```
Error: SamSub credentials not configured. Please set SAMSUB_APP_TOKEN, SAMSUB_SECRET_KEY, and SAMSUB_APP_ID environment variables.
```

This means your Vercel deployment doesn't have the required SumSub API credentials.

## Quick Fix - Add Environment Variables

### Option 1: Via Vercel Dashboard (Recommended)

1. **Go to your Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project

2. **Navigate to Settings**
   - Click **Settings** tab
   - Click **Environment Variables** in the left sidebar

3. **Add These Variables**
   
   Click "Add New" for each:

   **Variable 1:**
   - **Key:** `SAMSUB_APP_TOKEN`
   - **Value:** `your_actual_token_here`
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development

   **Variable 2:**
   - **Key:** `SAMSUB_SECRET_KEY`
   - **Value:** `your_actual_secret_here`
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development

   **Variable 3:**
   - **Key:** `SAMSUB_APP_ID`
   - **Value:** `your_actual_app_id_here`
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development

   **Variable 4 (Optional):**
   - **Key:** `SAMSUB_API_URL`
   - **Value:** `https://api.sumsub.com`
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development

4. **Redeploy Your Project**
   - Go to **Deployments** tab
   - Click the **︙** (three dots) on the latest deployment
   - Click **Redeploy**
   - ✅ Check "Use existing Build Cache"
   - Click **Redeploy** button

### Option 2: Via Vercel CLI

If you have Vercel CLI installed:

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (run in your project directory)
vercel link

# Add environment variables
vercel env add SAMSUB_APP_TOKEN production
# Paste your token when prompted

vercel env add SAMSUB_SECRET_KEY production
# Paste your secret when prompted

vercel env add SAMSUB_APP_ID production
# Paste your app ID when prompted

# Redeploy
vercel --prod
```

## Where to Get SumSub Credentials

### Step 1: Login to SumSub Dashboard
Visit: https://cockpit.sumsub.com/

### Step 2: Navigate to Settings
- Click **Settings** (gear icon) in the top right
- Click **App Tokens** in the left menu

### Step 3: Create or Copy Credentials

#### For Existing App Token:
- Find your app token in the list
- Click **View** or **Copy** button
- You'll see:
  - **App Token** (`sbprvd...`) → Copy this for `SAMSUB_APP_TOKEN`
  - **Secret Key** (long hexadecimal string) → Copy for `SAMSUB_SECRET_KEY`
  - **App ID** (short identifier) → Copy for `SAMSUB_APP_ID`

#### For New App Token:
1. Click **+ Create App Token**
2. Name it: `Vercel Production`
3. Set permissions: **All** or **API Integration**
4. Click **Create**
5. **⚠️ IMPORTANT:** Copy and save the credentials immediately (you can't view them again!)

## Testing After Setup

### 1. Check Health Endpoint
```bash
curl https://your-domain.vercel.app/api/samsub/kyc/health
```

Expected response:
```json
{
  "status": "online",
  "timestamp": "2025-11-08T...",
  "service": "SamSub KYC API"
}
```

### 2. Test Init Endpoint (requires valid credentials)
```bash
curl -X POST https://your-domain.vercel.app/api/samsub/kyc/init-automated \
  -H "Content-Type: application/json" \
  -d '{
    "externalUserId": "test_user_123",
    "levelName": "test-level",
    "email": "test@example.com"
  }'
```

If credentials are correct, you'll get:
```json
{
  "success": true,
  "data": {
    "applicant": {...},
    "accessToken": "...",
    "webSDKLink": {...}
  }
}
```

If credentials are missing, you'll get:
```json
{
  "success": false,
  "error": {
    "message": "SumSub credentials not configured. Missing: ..."
  }
}
```

## Common Issues & Solutions

### Issue 1: Variables Not Taking Effect After Adding
**Solution:** You must redeploy after adding environment variables!
- Go to Deployments → Latest deployment → ︙ → Redeploy

### Issue 2: Wrong Credentials Format
**Symptoms:** `401 Unauthorized` or `Invalid signature`
**Solution:**
- ✅ App Token should start with `sbprvd` or similar
- ✅ Secret Key is a long hexadecimal string (64+ characters)
- ✅ App ID is shorter (like `yourappname`)
- ⚠️ No extra spaces or quotes around values

### Issue 3: Preview vs Production
**Problem:** Works in preview but not production (or vice versa)
**Solution:** Make sure you selected all environments when adding variables:
- ✅ Production
- ✅ Preview  
- ✅ Development

### Issue 4: Still Getting Errors After Adding Variables
**Checklist:**
1. ✅ Variables are added in Vercel Dashboard → Settings → Environment Variables
2. ✅ All three required variables are present (check spelling!)
3. ✅ You clicked "Redeploy" after adding variables
4. ✅ Wait 30-60 seconds for redeployment to complete
5. ✅ Clear browser cache and test again

## Security Best Practices

### ✅ DO:
- Store credentials as environment variables in Vercel
- Use different tokens for development/staging/production
- Rotate tokens periodically
- Monitor SumSub Dashboard for suspicious activity

### ❌ DON'T:
- Never commit credentials to Git (even in `.env` files)
- Don't expose credentials in frontend code
- Don't share tokens in screenshots or documentation
- Don't use production tokens in development

## Verification Checklist

After setup, verify these work:

- [ ] Health check returns `{"status": "online"}`
- [ ] Init-automated returns `webSDKLink` URL
- [ ] Opening webSDKLink shows SumSub verification UI
- [ ] Status endpoint returns applicant data
- [ ] Webhook endpoint accepts POST requests

## Need Help?

### SumSub Support
- **Dashboard:** https://cockpit.sumsub.com/
- **Docs:** https://developers.sumsub.com/
- **Email:** support@sumsub.com

### Vercel Support  
- **Dashboard:** https://vercel.com/dashboard
- **Docs:** https://vercel.com/docs/concepts/projects/environment-variables
- **Discord:** https://vercel.com/discord

## Quick Reference

```bash
# Required Environment Variables
SAMSUB_APP_TOKEN=sbprvd_xxxxxxxxxxxxxx
SAMSUB_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SAMSUB_APP_ID=yourappname

# Optional
SAMSUB_API_URL=https://api.sumsub.com
```

Once these are set and you've redeployed, your KYC integration will work! 🚀
