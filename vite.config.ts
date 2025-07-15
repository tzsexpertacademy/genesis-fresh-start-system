import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  server: {
    port: 8080,
    // Prevent caching during development
    hmr: {
      overlay: false, // Disable the HMR overlay to prevent unwanted refreshes

      // Exclude specific files from triggering HMR
      exclude: [
        '**/backend/**/*.json',  // Ignore all JSON files in backend directory
        '**/sessions/**',        // Ignore all files in sessions directory
      ],
    },
    watch: {
      // Don't watch these files/directories
      ignored: [
        '**/backend/**/*.json',
        '**/backend/sessions/**',
        '**/backend/new_messages_flag.json',
        '**/backend/inbox.json',
      ]
    },
    headers: {
      'Cache-Control': 'no-store',
    },
    // Proxy API requests to backend server
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxy
      }
    },
  },
  build: {
    // Add timestamp to asset filenames to prevent caching issues
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
      },
    },
  },
});
