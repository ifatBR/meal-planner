import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  resolve: {
    alias: {
      '@modules': '/absolute/path/to/src/modules',
    },
  },
  test: {
    environment: 'node',
  },
});
