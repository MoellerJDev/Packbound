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
    passWithNoTests: false
  }
});
