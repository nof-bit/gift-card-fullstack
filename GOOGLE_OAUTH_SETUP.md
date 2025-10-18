# Google OAuth Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "Gift Card App" (or any name you prefer)
4. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API" or "Google Identity"
3. Click on "Google+ API" and click "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in required fields:
     - App name: "Gift Card App"
     - User support email: your email
     - Developer contact: your email
   - Click "Save and Continue" through all steps
4. For Application type, choose "Web application"
5. Set the name: "Gift Card App Web Client"
6. Add authorized redirect URIs:
   - `http://localhost:4000/api/auth/google/callback`
   - `http://localhost:5173/api/auth/google/callback` (for development)
7. Click "Create"

## Step 4: Copy Credentials

After creating, you'll see a popup with:
- **Client ID**: Copy this (looks like: 123456789-abcdefg.apps.googleusercontent.com)
- **Client Secret**: Copy this (looks like: GOCSPX-abcdefghijklmnop)

## Step 5: Update Environment Variables

Add these to your server/.env file:
```
GOOGLE_CLIENT_ID="your-client-id-here"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
```

## Step 6: Restart the Server

After adding the credentials, restart your server for the changes to take effect.
