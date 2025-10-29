# E-Responde Admin Deployment Guide

## Deploy to Render.com

### Prerequisites
1. GitHub repository with your code
2. Render.com account
3. Firebase project with Realtime Database enabled

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Deploy on Render

1. **Go to [Render.com](https://render.com)** and sign in
2. **Click "New +"** → **"Static Site"**
3. **Connect your GitHub repository**
4. **Configure the deployment:**
   - **Name:** `e-responde-admin`
   - **Branch:** `main`
   - **Root Directory:** Leave empty (or `Testing Forecasting/E-Responde-Admin` if needed)
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

### Step 3: Environment Variables (Optional)
If you want to use different Firebase config, add these in Render dashboard:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_GEMINI_API_KEY` (for AI forecast interpretation)

### Step 4: Deploy
Click **"Create Static Site"** and wait for deployment to complete.

### Step 5: Access Your App
Once deployed, you'll get a URL like: `https://e-responde-admin.onrender.com`

## Firebase Security Rules

Make sure your Firebase Realtime Database rules allow read access:

```json
{
  "rules": {
    "civilian": {
      "civilian crime reports": {
        ".read": true,
        ".write": "auth != null"
      }
    },
    "sos_alerts": {
      ".read": true,
      ".write": "auth != null"
    },
    "police": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## Troubleshooting

### Build Fails
- Check Node.js version (should be 18+)
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors

### App Doesn't Load
- Check browser console for errors
- Verify Firebase configuration
- Check network tab for failed requests

### Data Not Loading
- Verify Firebase security rules
- Check Firebase project is active
- Ensure Realtime Database is enabled

## Features Included
- ✅ Real-time crime analytics
- ✅ ARIMA forecasting with AI interpretation
- ✅ Interactive heatmaps
- ✅ SOS alert management
- ✅ Police dispatch system
- ✅ VoIP management
- ✅ Responsive design

## Support
For issues, check:
1. Render deployment logs
2. Browser console errors
3. Firebase console for database issues
