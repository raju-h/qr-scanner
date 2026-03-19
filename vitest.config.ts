import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
  },
  esbuild: {
    // Automatically inject React import for JSX — mirrors Next.js behaviour
    // so components don't need explicit `import React from "react"` in tests.
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
