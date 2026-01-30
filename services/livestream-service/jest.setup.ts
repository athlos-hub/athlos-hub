import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables BEFORE any modules are imported
dotenv.config({
  path: path.resolve(__dirname, '.env.test'),
});
