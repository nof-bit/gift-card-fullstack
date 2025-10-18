# Gift Card App - Backend Setup Guide

## Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=4000
FRONTEND_URL="http://localhost:5173"

# Google OAuth Configuration
# Get these from Google Cloud Console: https://console.cloud.google.com/
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email Configuration (for development, using Gmail)
# For Gmail, you need to use an App Password, not your regular password
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@giftcardapp.com"
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create OAuth 2.0 Client IDs
5. Set the authorized redirect URI to: `http://localhost:4000/api/auth/google/callback`
6. Copy the Client ID and Client Secret to your `.env` file

## Gmail Setup for Email

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `SMTP_PASS` (not your regular Gmail password)

## Running the Server

```bash
cd server
npm install
npm run dev
```

## Features Added

- ✅ Google OAuth login
- ✅ Forgot password functionality
- ✅ Email sending for password reset
- ✅ Welcome emails for new users
- ✅ Password reset with secure tokens
- ✅ Updated database schema for OAuth users
