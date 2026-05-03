import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/wound-detector/',
  plugins: [
    react(),
    {
      name: "redirect-missing-trailing-slash",
      configureServer(server) {
        server.middlewares.use((req: any, res, next) => {
          if (req.url === "/wound-detector") {
            res.writeHead(301, { Location: "/wound-detector/" });
            res.end();
          } else {
            next();
          }
        });
      },
    },
  ],
  server: {
    port: 5173,
    host: '127.0.0.1',
    // ADD THIS SECTION ----------------------
    allowedHosts: [
      'api.questcity.cloud'
    ]
    // ---------------------------------------
  }
})