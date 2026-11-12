import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        booking: resolve(import.meta.dirname, 'booking.html'),
        contact: resolve(import.meta.dirname, 'contact.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
