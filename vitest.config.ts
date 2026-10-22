import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Count every app source file, not only the ones a test imports. app.ts and
    // app-root.ts only boot NativeScript and stay uncovered on purpose.
    coverage: { include: ['app/**/*.ts'] },
  },
});
