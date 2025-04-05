import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import prism from 'vite-plugin-prismjs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
  prism({
    languages: ['python'],
    plugins: ['line-numbers'],
    theme: 'tomorrow',
    css: true,
  }),
  ],
})
