// pages/api/auth/callback.js
import cookie from 'cookie';
import jwt_decode from 'jwt-decode';
import { chatServiceHost, tenantServiceHost } from '@/app/config';


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter.' });
  }

  // Decode the state parameter (assuming it's base64-encoded JSON)
  let decodedState;
  try {
    const decodedString = Buffer.from(state, 'base64').toString('utf-8');
    decodedState = JSON.parse(decodedString);
  } catch (error) {
    console.error('Error decoding state:', error);
    return res.status(400).json({ error: 'Invalid state parameter.' });
  }

  const { tenant, csrf } = decodedState;

  // Validate CSRF token from cookies
  const cookies = cookie.parse(req.headers.cookie || '');
  const storedCsrf = cookies['oauth_csrf_token'];

  if (csrf !== storedCsrf) {
    return res.status(400).json({ error: 'Invalid CSRF token.' });
  }

  // Exchange authorization code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: 'https://auth.flashresponse.net/api/auth/callback',
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    console.error('Error exchanging code for tokens:', tokenData.error);
    return res.status(400).json({ error: tokenData.error_description });
  }

  const { id_token, access_token } = tokenData;

  // Decode the ID token to get user information
  const decoded = jwt_decode(id_token);

  // Extract necessary user information
  const { sub: googleId, email, name } = decoded;

  // Fetch tenantId using tenant alias (subdomain)
  try {
    const params = new URLSearchParams();
    params.append('alias', tenant);
    const tenantResponse = await fetch(
      `${tenantServiceHost}/api/v1/tenants/check?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    let tenantId;
    if (tenantResponse.ok) {
      const tenantData = await tenantResponse.json();
      tenantId = tenantData.data.tenant_id;
    } else {
      const errorData = await tenantResponse.json();
      console.error('Unable to verify tenant:', errorData.message);
      return res.status(400).json({ error: errorData.message || 'Unable to verify tenant.' });
    }

    console.log('Fetched tenant ID:', tenantId);

    // Call backend login API with tenantId in headers and user info in the body
    const backendResponse = await fetch(
      `${chatServiceHost}/api/v1/tenants/${tenantId}/users/login-oauth`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          googleId,
          email,
          name,
          accessToken: access_token, // Optional: Pass access token if needed
        }),
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      console.error('Backend login failed:', errorData);
      return res.status(backendResponse.status).json({ error: errorData.message || 'Backend login failed.' });
    }

    const backendData = await backendResponse.json();

    // Assume backendData contains a JWT token
    const { token } = backendData;

    if (!token) {
      return res.status(500).json({ error: 'Token not provided by backend.' });
    }

    // Forward the Set-Cookie header from backend to the client
    const backendCookies = backendResponse.headers.raw()['set-cookie'];
    if (backendCookies) {
      res.setHeader('Set-Cookie', backendCookies);
    }

    // Redirect back to tenant subdomain
    return res.redirect(`https://${tenant}/?auth=success`);
  } catch (error) {
    console.error('Error during OAuth callback processing:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
