import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
  },
  preview: {
    allowedHosts: ['merchant.payport.africa', 'merchant-staging.payport.africa', 'localhost'],
  },
})
