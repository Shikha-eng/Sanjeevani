// Next.js Middleware for Authentication & Optimization
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add caching headers for static assets
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // API responses - add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    // Enable compression
    response.headers.set('Accept-Encoding', 'gzip, deflate, br');
  }

  // Client hints for adaptive loading
  response.headers.set('Accept-CH', 'DPR, Viewport-Width, Width, Downlink');

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
