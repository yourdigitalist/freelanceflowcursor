/**
 * Standalone bundle analysis — does NOT use or modify vite.config.ts or the normal `npm run build`.
 * Output: docs/bundle-report.html + docs/bundle-stats.json (gitignored if desired)
 *
 * Run: node scripts/analyze-bundle.mjs
 * Requires: npm install -D rollup-plugin-visualizer --no-save  (or already in node_modules)
 */
import { build } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let visualizer;
try {
  const mod = await import("rollup-plugin-visualizer");
  visualizer = mod.visualizer ?? mod.default?.visualizer ?? mod.default;
} catch {
  console.error(
    "Missing rollup-plugin-visualizer. Run:\n  npm install -D rollup-plugin-visualizer --no-save\n  node scripts/analyze-bundle.mjs",
  );
  process.exit(1);
}

const outDir = path.join(root, "dist-bundle-analyze");
const statsJsonPath = path.join(root, "docs", "bundle-stats.json");
const reportHtmlPath = path.join(root, "docs", "bundle-report.html");

fs.mkdirSync(path.join(root, "docs"), { recursive: true });

const result = await build({
  configFile: false,
  root,
  plugins: [
    react(),
    visualizer({
      filename: reportHtmlPath,
      gzipSize: true,
      brotliSize: true,
      open: false,
      template: "treemap",
      sourcemap: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: true,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});

const outputs = result && typeof result === "object" && "output" in result ? result.output : [];
const chunks = Array.isArray(outputs) ? outputs : [];

const chunkSummary = chunks
  .filter((o) => o.type === "chunk")
  .map((o) => ({
    name: o.name || o.fileName,
    file: o.fileName,
    size: o.code?.length ?? 0,
  }))
  .sort((a, b) => b.size - a.size);

const assetsDir = path.join(outDir, "assets");
let assetFiles = [];
if (fs.existsSync(assetsDir)) {
  assetFiles = fs
    .readdirSync(assetsDir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => {
      const stat = fs.statSync(path.join(assetsDir, f));
      return { file: `assets/${f}`, bytes: stat.size };
    })
    .sort((a, b) => b.bytes - a.bytes);
}

const summary = {
  generatedAt: new Date().toISOString(),
  outDir: "dist-bundle-analyze",
  note: "Analysis build only; production build unchanged.",
  chunks: chunkSummary,
  assetsOnDisk: assetFiles,
  reportHtml: "docs/bundle-report.html",
};

fs.writeFileSync(statsJsonPath, JSON.stringify(summary, null, 2));

console.log("\nBundle analysis complete (production config untouched)\n");
console.log(`  HTML treemap: ${reportHtmlPath}`);
console.log(`  Summary JSON: ${statsJsonPath}`);
console.log(`  Temp output:  ${outDir}/\n`);
if (assetFiles.length) {
  console.log("Largest JS assets on disk:");
  for (const a of assetFiles.slice(0, 5)) {
    console.log(`  ${(a.bytes / 1024).toFixed(1)} KB  ${a.file}`);
  }
}
