import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  build: {
    outDir: "./dist",
    sourcemap: false,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
      },
      // Externalize Node.js built-ins - Electron can resolve these via require()
      external: [
        'node:fs',
        'node:fs/promises',
        'node:path',
        'node:os',
        'node:child_process',
        'node:crypto',
        'node:stream',
        'node:util',
        'node:events',
        'node:buffer',
        'fs',
        'fs/promises',
        'path',
        'os',
        'child_process',
        'crypto',
        'stream',
        'util',
        'events',
        'buffer',
      ],
      output: {
        // Use CJS format so require() works in Electron
        format: 'cjs',
        entryFileNames: 'assets/[name].js',
      },
    },
  },
  plugins: [react()],
});
