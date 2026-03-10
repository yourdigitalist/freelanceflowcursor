import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "localhost",
    port: 5173,
    strictPort: false,
    // Open in default system browser. Do NOT use Cursor's in-editor browser—it hangs on localhost.
    open: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Pre-bundle heavy deps to speed up first dev startup
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "@supabase/supabase-js"],
  },
});
