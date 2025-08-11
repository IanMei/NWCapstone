import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import os from 'os';

// 🔍 Get the local IPv4 address (non-internal)
function getLocalExternalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip internal (127.x, ::1) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1'; // fallback
}

const localIP = getLocalExternalIP();
const backendURL = `http://${localIP}:5172`; // dynamically use your LAN IP

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // so other devices can connect
    port: 5173,
    proxy: {
      '/api': {
        target: backendURL,
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: backendURL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
