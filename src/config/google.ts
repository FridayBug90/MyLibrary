/**
 * Google OAuth 2.0 Configuration
 *
 * SETUP REQUIRED — do this once before using backup:
 *
 * 1. Go to https://console.cloud.google.com
 * 2. Create a project (e.g. "my-library-backup")
 * 3. APIs & Services → Enable API → search "Google Drive API" → Enable
 * 4. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
 *    - Application type: Android
 *    - Package name: com.virtual.library
 *    - SHA-1 certificate fingerprint (debug):
 *        keytool -keystore ~/.android/debug.keystore -list -v
 *        (default password: android  →  copy the SHA1 line)
 * 5. Save and copy the Client ID shown (format: NUMBERS-HASH.apps.googleusercontent.com)
 * 6. Paste it below, replacing YOUR_CLIENT_ID.apps.googleusercontent.com
 * 7. In android/app/src/main/AndroidManifest.xml replace YOUR_REDIRECT_SCHEME
 *    with the value of GOOGLE_REDIRECT_SCHEME (visible in the generated code below)
 */

export const GOOGLE_CLIENT_ID = '369477163473-t0th71vkdn1cp2miuakt76k3s6ssruq4.apps.googleusercontent.com';

// Auto-derived from the Client ID — do NOT change this line
// Example: "123456-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.123456-abc"
export const GOOGLE_REDIRECT_SCHEME = `com.googleusercontent.apps.${GOOGLE_CLIENT_ID.replace('.apps.googleusercontent.com', '')}`;
