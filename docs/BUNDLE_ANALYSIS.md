# Bundle analysis (Lance app)

Generated from an **isolated** analysis build. Your production `vite.config.ts` and `npm run build` are **unchanged**.

## Summary

| Asset | Minified | Gzipped |
|-------|----------|---------|
| Main JS (`index-*.js`) | **3,219 KB** (~3.1 MB) | **905 KB** |
| Secondary chunk (`index.es-*.js`) | 159 KB | 53 KB |
| CSS | 147 KB | 25 KB |

**Verdict:** The app ships as **one large JS bundle** (no route code-splitting). First visit downloads ~**905 KB gzipped** JavaScript—heavy for mobile/slow networks, but normal for an all-in-one B2B SPA. This does **not** scale with user count; each browser downloads the same file once (then caches).

**Scaling with users** is dominated by Supabase (queries, RLS, edge functions), not bundle size.

---

## Top contributors (rendered size in bundle)

From Rollup visualizer (`docs/bundle-report.html`), aggregated by package/area:

| Rank | Size (approx.) | What it is |
|------|----------------|------------|
| 1 | 714 KB | `src/pages` — all route pages imported from `App.tsx` |
| 2 | 333 KB | `jspdf` — PDF generation |
| 3 | 316 KB | `src/components` — shared UI |
| 4 | 249 KB | `recharts` — dashboard charts |
| 5 | 213 KB | `quill` — rich text (notes) |
| 6 | 199 KB | `html2canvas` — PDF/screenshot capture |
| 7 | 130 KB | `react-dom` |
| 8 | 98 KB | `src/lib` |
| 9 | 84 KB | `@supabase/auth-js` |
| 10 | 80 KB | `canvg` — pulled in via jsPDF/html2canvas chain |

Also notable: `zod` (~53 KB), `date-fns` (~27 KB), many `@radix-ui/*` packages (combined ~100–150 KB), `lucide-react` (~14 KB in this tree—icons may tree-shake per usage).

---

## Why it feels “heavy”

1. **`App.tsx` eagerly imports every page** — no `React.lazy()` / route splitting.
2. **PDF stack in the main graph** — `jspdf`, `html2canvas`, `canvg` load even if the user only opens Dashboard.
3. **Editor + charts** — Quill and Recharts are large and tied to Notes/Dashboard.
4. **Large page files** — e.g. `InvoiceDetail`, `Dashboard`, `ClientDetail` add up under `src/pages`.

---

## Safe improvements (when you choose to implement)

These are **recommendations only**—not applied to the repo automatically.

| Priority | Change | Expected impact |
|----------|--------|-----------------|
| High | `React.lazy()` per route in `App.tsx` | Smaller initial chunk; pages load on demand |
| High | Dynamic `import()` for `jspdf` + `html2canvas` only on Invoice/Contract PDF actions | ~500+ KB off initial load |
| Medium | Dynamic `import()` for `react-quill` on Notes routes | ~200 KB off initial load |
| Medium | Dynamic `import()` for `recharts` on Dashboard only | ~250 KB off initial load |
| Low | Split marketing/landing (`LpTest`, framer-motion) from app shell | Cleaner public vs app bundles |
| Low | Audit `lucide-react` vs `react-icons` — use one icon set | Minor savings |

**Do not** change production `manualChunks` blindly without testing every route.

---

## How to re-run this analysis

Does **not** replace `npm run build`. Output goes to `dist-bundle-analyze/` (gitignored).

```bash
npm install -D rollup-plugin-visualizer --no-save
node scripts/analyze-bundle.mjs
```

Then open **`docs/bundle-report.html`** in a browser (interactive treemap).

Optional: compare with production build sizes:

```bash
npm run build
```

---

## Other checks (runtime & backend)

| Tool | What it tells you |
|------|-------------------|
| Chrome **Lighthouse** on live app | LCP, TBT, “unused JavaScript” |
| Chrome **Network** tab (disable cache) | Real download time |
| Supabase **Advisors** + slow query logs | DB/RLS at scale |
| Seed large data (`npm run seed`) | Worst-case list/dashboard fetches |

---

*Analysis date: 2026-05-29. Main chunk hash may change between builds; sizes stay in the same ballpark.*
