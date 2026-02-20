import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // To exclude specific polyfills, add them to this list.
      exclude: [],
      // Whether to polyfill `buffer` and `process`.
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill specific Node.js modules.
      protocolImports: true,
    }),
  ],
  define: {
    // This ensures global is defined (used by some libraries)
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis mapping
      define: {
        global: 'globalThis',
      },
    },
  },
});