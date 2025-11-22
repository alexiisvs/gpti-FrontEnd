import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/

// Es para que corra que funcione con el back utilizando CORS
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Configurar para manejar respuestas binarias (audio)
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Si es una respuesta de audio, asegurar que los headers se mantengan
            if (proxyRes.headers['content-type']?.includes('audio')) {
              res.setHeader('Content-Type', proxyRes.headers['content-type']);
              res.setHeader('Content-Length', proxyRes.headers['content-length']);
            }
          });
        }
      }
    },
  },
})
