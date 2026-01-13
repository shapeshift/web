import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isLibBuild = process.env.BUILD_LIB === 'true'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
  },
  server: {
    port: 3001,
    open: true,
  },
  preview: {
    port: Number(process.env.PORT) || 3000,
    host: true,
  },
  build: isLibBuild
    ? {
        lib: {
          entry: 'src/index.ts',
          name: 'SwapWidget',
          fileName: 'index',
        },
        rollupOptions: {
          external: ['react', 'react-dom'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
            },
          },
        },
      }
    : {
        outDir: 'dist',
      },
})
