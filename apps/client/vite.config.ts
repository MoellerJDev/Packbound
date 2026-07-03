import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const alias = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const base =
  process.env.PACKBOUND_PAGES === "true" || process.env.GITHUB_PAGES === "true"
    ? "/Packbound/"
    : "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@packbound/shared": alias("../../packages/shared/src/index.ts"),
      "@packbound/content": alias("../../packages/content/src/index.ts"),
      "@packbound/rules": alias("../../packages/rules/src/index.ts"),
      "@packbound/sim": alias("../../packages/sim/src/index.ts")
    }
  }
});
