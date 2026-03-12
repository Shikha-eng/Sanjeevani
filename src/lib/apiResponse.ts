// API Response Utilities - Optimized for Minimal Payload
import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Success response with optional caching
export function apiSuccess<T>(
  data: T,
  meta?: ApiResponse<T>['meta'],
  cacheHeaders?: { etag?: string; maxAge?: number }
) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add cache headers for low bandwidth optimization
  if (cacheHeaders) {
    if (cacheHeaders.etag) {
      headers['ETag'] = cacheHeaders.etag;
    }
    if (cacheHeaders.maxAge) {
      headers['Cache-Control'] = `public, max-age=${cacheHeaders.maxAge}`;
    }
  }

  return NextResponse.json(response, { headers });
}

// Error response
export function apiError(
  error: string,
  status: number = 400
) {
  const response: ApiResponse = {
    success: false,
    error,
  };

  return NextResponse.json(response, { status });
}

// Unauthorized response
export function apiUnauthorized(message: string = 'Unauthorized') {
  return apiError(message, 401);
}

// Not found response
export function apiNotFound(message: string = 'Resource not found') {
  return apiError(message, 404);
}

// Create ETag from data
export function createETag(data: any): string {
  const crypto = require('crypto');
  return crypto
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
}

// Check if ETag matches (304 Not Modified)
export function checkETag(
  requestETag: string | null,
  currentETag: string
): boolean {
  return requestETag === currentETag;
}
