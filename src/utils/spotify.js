import { getSpotifyToken, setSpotifyToken, clearSpotifyToken } from './supabaseDb';

const SPOTIFY_CLIENT_ID = 'fedaa660c7a540bf8c7389e0a09e9bfa';
const REDIRECT_URI = window.location.origin;
const SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state';

// PKCE helpers
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Handle OAuth callback on page load
(async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return;

  const verifier = localStorage.getItem('spotify_code_verifier');
  if (!verifier) return;

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('spotify_access_token', data.access_token);
      localStorage.setItem('spotify_token_expiry', String(Date.now() + data.expires_in * 1000));
      localStorage.removeItem('spotify_code_verifier');
      // Persist refresh token to account
      if (data.refresh_token) {
        localStorage.setItem('spotify_refresh_token', data.refresh_token);
        setSpotifyToken(data.refresh_token).catch(() => {});
      }
    }
  } catch {}

  window.history.replaceState({}, '', window.location.pathname);
})();

export async function loginWithSpotify() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem('spotify_code_verifier', verifier);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function getAccessToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expiry = localStorage.getItem('spotify_token_expiry');

  if (token && expiry && Date.now() < Number(expiry)) {
    return token;
  }

  // Try localStorage first, then fall back to Supabase
  let refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) {
    refreshToken = await getSpotifyToken();
    if (refreshToken) {
      localStorage.setItem('spotify_refresh_token', refreshToken);
    }
  }
  if (!refreshToken) return null;

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('spotify_access_token', data.access_token);
      localStorage.setItem('spotify_token_expiry', String(Date.now() + data.expires_in * 1000));
      if (data.refresh_token) {
        localStorage.setItem('spotify_refresh_token', data.refresh_token);
        setSpotifyToken(data.refresh_token).catch(() => {});
      }
      return data.access_token;
    }
  } catch {}

  return null;
}

export function isSpotifyConnected() {
  return !!localStorage.getItem('spotify_refresh_token');
}

export async function isSpotifyConnectedAsync() {
  if (localStorage.getItem('spotify_refresh_token')) return true;
  const token = await getSpotifyToken();
  if (token) {
    localStorage.setItem('spotify_refresh_token', token);
    return true;
  }
  return false;
}

export async function disconnectSpotify() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expiry');
  await clearSpotifyToken();
}

export async function searchTrack(title, artist) {
  const token = await getAccessToken();
  if (!token) return null;

  const q = encodeURIComponent(`track:${title} artist:${artist}`);
  const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.tracks?.items?.[0]?.uri || null;
}
