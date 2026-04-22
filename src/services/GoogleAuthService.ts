import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { CapacitorHttp } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_SCHEME } from '../config/google';

const REDIRECT_URI = `${GOOGLE_REDIRECT_SCHEME}:/oauth2redirect`;
const SCOPE        = 'https://www.googleapis.com/auth/drive.file openid email';
const AUTH_URL     = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL    = 'https://oauth2.googleapis.com/token';

const PREF_ACCESS_TOKEN  = 'google_access_token';
const PREF_REFRESH_TOKEN = 'google_refresh_token';
const PREF_TOKEN_EXPIRY  = 'google_token_expiry';
const PREF_USER_EMAIL    = 'google_user_email';

// ---- crypto helpers ----

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => chars[b % chars.length]).join('');
}

async function sha256Base64url(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ---- HTTP helper (mirrors LookupService pattern) ----

async function httpPost(url: string, body: string): Promise<Record<string, unknown>> {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.post({ url, headers, data: body });
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  }
  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---- Service ----

class GoogleAuthServiceClass {
  private pendingCallback: ((url: string) => void) | null = null;

  /** Called by App.tsx when appUrlOpen fires with the OAuth redirect URL */
  handleRedirect(url: string): void {
    if (this.pendingCallback) {
      this.pendingCallback(url);
      this.pendingCallback = null;
    }
  }

  async isSignedIn(): Promise<boolean> {
    const { value } = await Preferences.get({ key: PREF_REFRESH_TOKEN });
    return !!value;
  }

  async getUserEmail(): Promise<string | null> {
    const { value } = await Preferences.get({ key: PREF_USER_EMAIL });
    return value;
  }

  /** Opens the Google sign-in browser and waits for the OAuth redirect. */
  async signIn(): Promise<boolean> {
    const codeVerifier  = randomString(64);
    const codeChallenge = await sha256Base64url(codeVerifier);
    const state         = randomString(16);

    const params = new URLSearchParams({
      client_id:             GOOGLE_CLIENT_ID,
      redirect_uri:          REDIRECT_URI,
      response_type:         'code',
      scope:                 SCOPE,
      code_challenge:        codeChallenge,
      code_challenge_method: 'S256',
      state,
      access_type:           'offline',
      prompt:                'consent',
    });

    return new Promise<boolean>((resolve) => {
      this.pendingCallback = async (redirectUrl: string) => {
        try { await Browser.close(); } catch { /* already closed */ }

        const url   = new URL(redirectUrl);
        const code  = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const ret   = url.searchParams.get('state');

        if (error || !code || ret !== state) { resolve(false); return; }

        try {
          resolve(await this.exchangeCode(code, codeVerifier));
        } catch {
          resolve(false);
        }
      };

      Browser.open({ url: `${AUTH_URL}?${params}` }).catch(() => resolve(false));
    });
  }

  private async exchangeCode(code: string, codeVerifier: string): Promise<boolean> {
    const body = new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
      code,
      code_verifier: codeVerifier,
    }).toString();

    const data = await httpPost(TOKEN_URL, body);
    await this.storeTokens(data);
    return true;
  }

  async refreshAccessToken(): Promise<string | null> {
    const { value: refreshToken } = await Preferences.get({ key: PREF_REFRESH_TOKEN });
    if (!refreshToken) return null;

    const body = new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }).toString();

    try {
      const data = await httpPost(TOKEN_URL, body);
      await this.storeTokens(data);
      return (data.access_token as string) ?? null;
    } catch {
      return null;
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    const { value: expiry }      = await Preferences.get({ key: PREF_TOKEN_EXPIRY });
    const { value: accessToken } = await Preferences.get({ key: PREF_ACCESS_TOKEN });

    if (accessToken && expiry && parseInt(expiry) > Date.now() + 60_000) {
      return accessToken;
    }
    return this.refreshAccessToken();
  }

  async signOut(): Promise<void> {
    await Preferences.remove({ key: PREF_ACCESS_TOKEN });
    await Preferences.remove({ key: PREF_REFRESH_TOKEN });
    await Preferences.remove({ key: PREF_TOKEN_EXPIRY });
    await Preferences.remove({ key: PREF_USER_EMAIL });
  }

  private async storeTokens(data: Record<string, unknown>): Promise<void> {
    if (data.access_token) {
      await Preferences.set({ key: PREF_ACCESS_TOKEN, value: data.access_token as string });
    }
    if (data.refresh_token) {
      await Preferences.set({ key: PREF_REFRESH_TOKEN, value: data.refresh_token as string });
    }
    if (data.expires_in) {
      const expiry = (Date.now() + (data.expires_in as number) * 1000).toString();
      await Preferences.set({ key: PREF_TOKEN_EXPIRY, value: expiry });
    }
    // Extract email from the JWT id_token payload
    if (data.id_token) {
      try {
        const payload = JSON.parse(atob((data.id_token as string).split('.')[1]));
        if (payload.email) {
          await Preferences.set({ key: PREF_USER_EMAIL, value: payload.email as string });
        }
      } catch { /* id_token not present or malformed */ }
    }
  }
}

export const GoogleAuthService = new GoogleAuthServiceClass();
