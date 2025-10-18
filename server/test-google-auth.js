// Test script to verify Google OAuth configuration
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Checking Google OAuth Configuration...\n');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

console.log('📋 Current Configuration:');
console.log(`GOOGLE_CLIENT_ID: ${clientId ? '✅ Set' : '❌ Not set'}`);
console.log(`GOOGLE_CLIENT_SECRET: ${clientSecret ? '✅ Set' : '❌ Not set'}\n`);

if (clientId && clientSecret) {
  if (clientId === 'your-google-client-id-here' || clientSecret === 'your-google-client-secret-here') {
    console.log('⚠️  WARNING: You still have placeholder values!');
    console.log('Please update your .env file with actual Google OAuth credentials.\n');
  } else {
    console.log('✅ Google OAuth appears to be configured!');
    console.log('You can now test Google login in your application.\n');
  }
} else {
  console.log('❌ Google OAuth is not configured.');
  console.log('Please follow the setup guide in GOOGLE_OAUTH_SETUP.md\n');
}

console.log('🌐 Test URLs:');
console.log('Frontend: http://localhost:5173');
console.log('Backend: http://localhost:4000');
console.log('Google OAuth: http://localhost:4000/api/auth/google');
