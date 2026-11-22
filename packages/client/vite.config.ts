import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite's settings. The React plugin adds JSX support and instant updates on save.
export default defineConfig({
  plugins: [react()],
});