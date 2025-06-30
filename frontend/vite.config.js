import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,  // Keep this as-is
    open: true,
    cors: true,
    proxy: {
      '/api': 'http://localhost:3001' // ✅ This is the fix
    }
  }
});
