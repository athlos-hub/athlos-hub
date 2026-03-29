import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables BEFORE any modules are imported
// First try to load from .env.test file
dotenv.config({
  path: path.resolve(__dirname, '.env.test'),
});

// Set default test environment variables if not already set
// This ensures tests work in CI environments where .env.test doesn't exist
const testDefaults: Record<string, string> = {
  ENV: 'dev',
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/livestream_test',
  PORT: '3333',
  KEYCLOAK_REALM: 'athlos',
  KEYCLOAK_CLIENT_ID: 'auth-client',
  KEYCLOAK_CLIENT_SECRET: 'test-secret',
  KEYCLOAK_URL: 'http://localhost:8100/keycloak/',
  KEYCLOAK_ISSUER: 'http://localhost:8100/keycloak',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3333/auth/google/callback',
  AUTH_SERVICE_URL: 'http://localhost:3001',
  AUTH_SERVICE_API_KEY: 'test-api-key',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_DB: '1',
  MEDIAMTX_URL: 'http://localhost:9997',
  LOG_LEVEL: 'error',
  TRUST_GATEWAY: 'true',
};

// Set defaults for any missing environment variables
Object.entries(testDefaults).forEach(([key, value]) => {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }});