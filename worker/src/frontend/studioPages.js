// AI Creative Studio — Studio Pages lazy loader (V2 refactor, rule 10)
// -------------------------------------------------------------------
// Each Studio's page code is loaded ONLY when that studio is opened.
// Dynamic import with static literal specifiers is bundled by wrangler and
// defers module evaluation/parse to first use.
// API contract unchanged: same routes, same HTML output, same responses.
export const STUDIO_LOADERS = {
  story: () => import('./studios/story/page.js'),
  'story-video-plan': () => import('./studios/story-video-plan/page.js'),
  content: () => import('./studios/content/page.js'),
  short: () => import('./studios/short/page.js'),
  image: () => import('./studios/image/page.js'),
  voice: () => import('./studios/voice/page.js'),
  subtitle: () => import('./studios/subtitle/page.js'),
  shop: () => import('./studios/shop/page.js'),
};

/**
 * Returns the studio page HTML (string) for a studio slug, or null when the
 * slug is not a registered studio. Never throws for unknown slugs.
 *
 * A known studio whose module fails to load must not be reported as unknown.
 * Import errors intentionally propagate to index.js, which maps them to 500.
 */
export async function getStudioPage(slug) {
  const loader = STUDIO_LOADERS[slug];
  if (!loader) return null;
  const mod = await loader();
  return (mod && mod.default) || null;
}
