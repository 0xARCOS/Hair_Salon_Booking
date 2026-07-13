import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./src/lib/local/__tests__/setup.ts"],
    // PBKDF2 con 600k iteraciones hace que cada derivación de clave tarde
    // de verdad; margen holgado para máquinas lentas de CI.
    testTimeout: 30_000,
  },
});
