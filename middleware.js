// middleware.js
import { NextResponse } from 'next/server';

// Define paths that don't require authentication
const PUBLIC_FILE = /\.(.*)$/;
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/api/auth', // Add any other public API routes here
];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow Next.js static files and public paths without authentication
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    PUBLIC_FILE.test(pathname) ||
    PUBLIC_PATHS.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get('jwt')?.value;

  if (!token) {
    // Redirect to login if token is missing
    const loginUrl = new URL('/login', request.url);
    // Optionally, include the original destination
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }


  return NextResponse.next();
}

// Define the matcher to apply middleware to all routes except the ones specified
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - /api/auth (you can adjust this to your API auth routes)
     * - /login
     * - /signup
     * - /_next/static
     * - /favicon.ico
     */
    '/((?!api/auth|login|signup|_next/static|favicon.ico).*)',
  ],
};
