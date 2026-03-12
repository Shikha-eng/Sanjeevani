// API Client Utility for Frontend
// Optimized for low bandwidth with automatic caching and compression handling

interface RequestOptions extends RequestInit {
  useCache?: boolean;
  fields?: string[];
}

class ApiClient {
  private baseUrl: string;
  private cache: Map<string, { data: any; etag: string; timestamp: number }>;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.cache = new Map();
  }

  private getCacheKey(url: string, options?: RequestOptions): string {
    return `${url}:${JSON.stringify(options?.fields || [])}`;
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTTL;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { useCache = true, fields, ...fetchOptions } = options;
    
    // Build URL with field selection
    let url = `${this.baseUrl}/api${endpoint}`;
    if (fields && fields.length > 0) {
      const params = new URLSearchParams({ fields: fields.join(',') });
      url += (url.includes('?') ? '&' : '?') + params.toString();
    }

    const cacheKey = this.getCacheKey(url, options);

    // Check cache for GET requests
    if (useCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isValidCache(cached.timestamp)) {
        // Add If-None-Match header for 304 check
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'If-None-Match': cached.etag,
        };
      }
    }

    // Make request
    const response = await fetch(url, fetchOptions);

    // Handle 304 Not Modified
    if (response.status === 304) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Request failed');
    }

    const data = await response.json();

    // Cache successful GET responses
    if (useCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
      const etag = response.headers.get('ETag');
      if (etag) {
        this.cache.set(cacheKey, {
          data: data.data,
          etag,
          timestamp: Date.now(),
        });
      }
    }

    return data.data as T;
  }

  // Convenience methods
  get<T = any>(endpoint: string, fields?: string[], useCache = true) {
    return this.request<T>(endpoint, { method: 'GET', fields, useCache });
  }

  post<T = any>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      useCache: false,
    });
  }

  patch<T = any>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      useCache: false,
    });
  }

  delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      useCache: false,
    });
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

export const apiClient = new ApiClient();
