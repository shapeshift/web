import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh
      fastRefresh: true,
    }),
    // Handle TypeScript path aliases
    tsconfigPaths(),
    // Handle node polyfills
    nodePolyfills({
      // Whether to polyfill specific globals
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill `node:` protocol imports
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      // Match your current path aliases
      '@shapeshiftoss': path.resolve(__dirname, './packages'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Improve build performance
    target: 'esnext',
    // Configure chunking strategy
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'chakra-vendor': ['@chakra-ui/react'],
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@chakra-ui/react',
      // Add other frequently used dependencies here
    ],
    exclude: [
      // Add any problematic packages that shouldn't be pre-bundled
    ],
  },
  server: {
    port: 3000,
    open: true,
    // Add any proxy configurations if needed
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8080',
    //     changeOrigin: true,
    //   },
    // },
  },
})
