import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  envDir: "../",
  envPrefix: "PAYPAL",
  root: "src",
  server: {
    host: true,
    port: process.env.PORT || 3000,
    proxy: {
      "/api": {
        target: process.env.SERVER_HOST || "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})