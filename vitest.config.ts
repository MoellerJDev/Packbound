import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

const alias = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@packbound/shared": alias("./packages/shared/src/index.ts"),
      "@packbound/content": alias("./packages/content/src/index.ts"),
      "@packbound/rules": alias("./packages/rules/src/index.ts"),
      "@packbound/sim": alias("./packages/sim/src/index.ts")
    }
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      all: true,
      reporter: ["text", "text-summary", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "packages/rules/src/**/*.{ts,tsx}",
        "packages/sim/src/**/*.{ts,tsx}",
        "packages/content/src/**/*.{ts,tsx}",
        "apps/client/src/**/*.{ts,tsx}"
      ],
      exclude: [
        "node_modules/**",
        "dist/**",
        "coverage/**",
        "apps/client/e2e/**",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/*.d.ts",
        "**/*.config.{ts,tsx,js,mjs,cjs}",
        "**/scripts/**",
        "**/main.tsx",
        "**/vite-env.d.ts"
      ],
      thresholds: {
        statements: 55,
        branches: 80,
        functions: 90,
        lines: 55
      }
    }
  }
});
