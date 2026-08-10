import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Ignorar erros de TypeScript no build
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignorar warnings específicos
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return
        }
        warn(warning)
      }
    }
  },
  // Definir variáveis de ambiente para o build
  define: {
    'process.env.CI': JSON.stringify(process.env.CI || 'true')
  }
})
