"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

const AuthPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenant = searchParams.get('tenant');

  useEffect(() => {
    if (tenant) {
      const csrfToken = uuidv4(); // Generate a unique CSRF token

      // Store CSRF token in a secure, HTTP-only cookie
      // Note: In client-side code, you cannot set HTTP-only cookies. 
      // HTTP-only cookies must be set from the server.
      // Instead, consider using secure cookies without HTTP-only or use server-side methods.
      document.cookie = `oauth_csrf_token=${csrfToken}; path=/; secure; SameSite=Lax`;

      // Encode the state parameter with tenant and CSRF token
      const state = btoa(JSON.stringify({ tenant, csrf: csrfToken }));

      const oauthParams = new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        redirect_uri: 'https://auth.flashresponse.net/auth/callback',
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'offline',
        prompt: 'consent',
      });

      // Redirect to Google's OAuth 2.0 server
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${oauthParams.toString()}`;
    } else {
      // Handle missing tenant parameter
      alert('Missing tenant information.');
      router.push('/');
    }
  }, [tenant, router]);

  return <div>Redirecting to Google for authentication...</div>;
};

export default AuthPage;
