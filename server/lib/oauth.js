import { sendMail } from './mailer.js';

/**
 * Social login provider interface.
 * Adapters implement: authorizeUrl(state), exchange(code) -> { subject, email, name }.
 * If credentials are absent the provider is reported as unconfigured and the route
 * answers 501 — an integration-ready interface, never a simulated sign-in.
 */

export function providerConfig() {
  return {
    google: Boolean(process.env.OAUTH_GOOGLE_CLIENT_ID && process.env.OAUTH_GOOGLE_CLIENT_SECRET),
    github: Boolean(process.env.OAUTH_GITHUB_CLIENT_ID && process.env.OAUTH_GITHUB_CLIENT_SECRET),
  };
}

export function redirectBase() {
  return process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 4180}`;
}

export function authorizeUrl(provider, state) {
  const base = redirectBase();
  if (provider === 'google') {
    const p = new URLSearchParams({
      client_id: process.env.OAUTH_GOOGLE_CLIENT_ID,
      redirect_uri: `${base}/api/auth/oauth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  }
  if (provider === 'github') {
    const p = new URLSearchParams({
      client_id: process.env.OAUTH_GITHUB_CLIENT_ID,
      redirect_uri: `${base}/api/auth/oauth/github/callback`,
      scope: 'read:user user:email',
      state,
    });
    return `https://github.com/login/oauth/authorize?${p}`;
  }
  throw Object.assign(new Error('Unknown provider'), { status: 400 });
}

export async function exchangeCode(provider, code) {
  const base = redirectBase();
  if (provider === 'google') {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.OAUTH_GOOGLE_CLIENT_ID,
        client_secret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
        redirect_uri: `${base}/api/auth/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) throw Object.assign(new Error('Google token exchange failed'), { status: 502 });
    const tokens = await res.json();
    const profile = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    })).json();
    return { subject: profile.sub, email: profile.email, name: profile.name || profile.email.split('@')[0] };
  }
  if (provider === 'github') {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.OAUTH_GITHUB_CLIENT_ID,
        client_secret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
        redirect_uri: `${base}/api/auth/oauth/github/callback`,
      }),
    });
    if (!res.ok) throw Object.assign(new Error('GitHub token exchange failed'), { status: 502 });
    const tokens = await res.json();
    const profile = await (await fetch('https://api.github.com/user', {
      headers: { authorization: `Bearer ${tokens.access_token}`, 'user-agent': 'lumen' },
    })).json();
    let email = profile.email;
    if (!email) {
      const emails = await (await fetch('https://api.github.com/user/emails', {
        headers: { authorization: `Bearer ${tokens.access_token}`, 'user-agent': 'lumen' },
      })).json();
      email = Array.isArray(emails) ? emails.find((e) => e.primary)?.email : null;
    }
    if (!email) throw Object.assign(new Error('GitHub account has no verified email'), { status: 400 });
    return { subject: String(profile.id), email, name: profile.name || profile.login };
  }
  throw Object.assign(new Error('Unknown provider'), { status: 400 });
}

export { sendMail };
