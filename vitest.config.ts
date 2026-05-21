import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// CI has no .env; modules that import the Supabase client need valid URLs at load time.
const testSupabaseUrl =
  process.env.VITE_SUPABASE_URL?.trim() || "https://placeholder.supabase.co";
const testSupabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || "eyJ0ZXN0In0.test-anon-key";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    env: {
      VITE_SUPABASE_URL: testSupabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: testSupabaseKey,
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
