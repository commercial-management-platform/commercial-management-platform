import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      CORS_ORIGIN: 'http://localhost:5173',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USER: 'cmp_user',
      DB_PASSWORD: 'change_me',
      DB_NAME: 'cmp_db',
      DB_SSL: 'false',
      BETTER_AUTH_SECRET: 'cmp_test_secret_key_at_least_32_chars_12345',
      BETTER_AUTH_URL: 'http://localhost:3000',
    },
  },
});
