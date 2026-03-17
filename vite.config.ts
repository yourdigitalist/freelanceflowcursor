import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "localhost",
    port: 5173,
    strictPort: false,
    open: false,
    hmr: { overlay: false },
    watch: {
      ignored: [
        "**/docs/**",
        "**/tmp-lp-rebuild/**",
        "**/supabase/functions/**",
        "**/magicuidesign-saas-template-*/**",
      ],
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Only scan deps from the app entry (root index.html). Other HTML files (docs/, supabase/, tmp-*) break the scan and cause ERR_EMPTY_RESPONSE.
  optimizeDeps: {
    entries: ["index.html"],
    include: ["react", "react-dom", "react-router-dom", "@supabase/supabase-js"],
  },
});
