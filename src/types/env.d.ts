// Environment Type Definitions
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      REDIS_URL: string;
      JWT_SECRET: string;
      JWT_EXPIRES_IN: string;
      API_RATE_LIMIT: string;
      CACHE_TTL: string;
      AI_API_KEY?: string;
      AI_MODEL?: string;
      MAX_FILE_SIZE: string;
      UPLOAD_DIR: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};
