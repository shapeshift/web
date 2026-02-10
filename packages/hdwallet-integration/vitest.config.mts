import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 120000,
    exclude: ["src/keepkey.test.ts"],
  },
});
