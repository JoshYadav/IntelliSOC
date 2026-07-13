import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': 'http://localhost:5000',
      },
    },
    build: {
      outDir: 'dist',
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(
        mode === 'production'
          ? 'https://intellisoc-9vgd.onrender.com'
          : 'http://localhost:5000'
      ),
    },
  };
});
