# Deployment Notes

## ⚠️ IMPORTANT: Before Deploying

1. Your `.env` file contains personal Strava tokens
2. These should NOT be committed to git
3. GitHub Pages will expose these tokens to the public
4. Anyone could use your tokens to access your Strava data

## ✅ Safe Deployment Steps:

1. Add `.env` to `.gitignore`
2. Use GitHub secrets for environment variables
3. Deploy as your personal dashboard only
4. Consider this app shows YOUR data only

## 🔒 For Production Multi-User App:

Would require:
- OAuth flow for users to connect their own accounts
- Backend server to store tokens securely
- User authentication system