// AI Creative Studio — Studio Pages lazy loader (V2 refactor, rule 10)
// -------------------------------------------------------------------
// Each Studio's page code is loaded ONLY when that studio is opened.
// Dynamic import with static literal specifiers is bundled by wrangler and
// defers module evaluation/parse to first use (no behavior change; the same
// HTML string is produced as before — byte-identical, verified by
// scripts/verify-split.mjs).
//
// API contract unchanged: same routes, same HTML output, same responses.
export const STUDIO_LOADERS = {
  story: () => import('./studios/story/page.js'),
  content: () => import('./studios/content/page.js'),
  short: () => import('./studios/short/page.js'),
  image: () => import('./studios/image/page.js'),
  voice: () => import('./studios/voice/page.js'),
  shop: () => import('./studios/shop/page.js'),
};

/**
 * Returns the studio page HTML (string) for a studio slug, or null when the
 * slug is not a registered studio. Never throws for unknown slugs.
 *
 * NOTE (Phase 1 — loader error contract): a KNOWN studio whose module fails to
 * load must NOT be reported as "unknown". Import errors are intentionally NOT
 * swallowed here — they propagate to index.js, which maps them to
 * 500 STUDIO_PAGE_LOAD_FAILED (with server-side logging of slug + message +
 * error id). Unknown slugs still return null → 404 STUDIO_NOT_FOUND.
 */
export async function getStudioPage(slug) {
  const loader = STUDIO_LOADERS[slug];
  if (!loader) return null;
  const mod = await loader();
  return (mod && mod.default) || null;
}
