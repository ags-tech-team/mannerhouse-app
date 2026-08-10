import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        if (warning.code?.startsWith('TS')) return
        warn(warning)
      }
    }
  },
  define: {
    'process.env.CI': JSON.stringify('false')
  }
})
