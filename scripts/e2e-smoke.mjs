#!/usr/bin/env node
/**
 * AI Creative Studio V2 — Browser E2E smoke suite (Phase 5)
 * ------------------------------------------------------------------
 * Drives the REAL worker (via scripts/e2e-server.mjs) in a REAL browser
 * (Playwright + preinstalled Chromium) and checks, for each of the 6
 * studios, the production checklist:
 *
 *   [x] page loads            [x] correct route
 *   [x] main UI renders       [x] required controls exist
 *   [x] input works           [x] main action works (request fires)
 *   [x] loading state works   [x] error state works (honest no-API-key failure)
 *   [ ] result state works    → BLOCKED: needs real AI provider credentials
 *   [x] navigation works      [x] refresh does not break page
 *
 * No fake success anywhere: without GEMINI_API_KEY the generate calls fail
 * with a genuine 500 → the friendly error UI, which is what we assert.
 *
 * Run: node --experimental-default-type=module scripts/e2e-smoke.mjs
 */
import { startE2EServer } from './e2e-server.mjs';

// Playwright: prefer the environment's global install; fall back to the VM path.
// (CJS module imported via ESM → chromium lives on the `default` export.)
async function loadPlaywright() {
  const candidates = [
    'playwright',
    '/opt/vm/preinstall/npm-global/lib/node_modules/playwright/index.js',
  ];
  for (const spec of candidates) {
    try {
      const m = await import(spec);
      const pw = m && m.default ? m.default : m;
      if (pw && pw.chromium) return pw;
    } catch (_) { /* try next */ }
  }
  throw new Error('Playwright module not available (tried ' + candidates.join(', ') + ')');
}
const CHROMIUM_PATH = '/opt/vm/preinstall/ms-playwright/chromium-1169/chrome-linux/chrome';

const STUDIOS = [
  {
    slug: 'story', path: '/app/story', title: 'Story Studio',
    idea: ['#field_0', 'ရန်ကုန်မှာ ကော်ဖီဆိုင်တစ်ဆိုင် ဖွင့်ချင်တဲ့ လူငယ်တစ်ယောက်'],
    action: '#genStoryBtn', loading: '.aics-result-loading.show', error: '.error-box.show',
    result: '#storyResult',
  },
  {
    slug: 'content', path: '/app/content', title: 'Content Studio',
    idea: ['#ideaInput', 'ကော်ဖီဆိုင်တစ်ဆိုင်အတွက် social media content'],
    action: '#genBtn', loading: '.aics-result-loading.show', error: '.error-box.show',
    result: '#contentOut',
  },
  {
    slug: 'short', path: '/app/short', title: 'Short Studio',
    idea: ['#field_0', 'မြန်မာရိုးရာ လက်ဖက်ရည်ဆိုင်ယဉ်ကျေးမှု 30 စက္ကန့် Short'],
    action: '#aicsActionsInner .aics-act.primary', loading: '.aics-result-loading.show', error: '.error-box.show',
    result: '#shortResult',
  },
  {
    slug: 'image', path: '/app/image', title: 'Image Studio',
    idea: ['#ideaInput', 'အနက်ရောင် Jacket ဝတ်ထားတဲ့ အမျိုးသား Tokyo ညဈေးလမ်းမှာ'],
    action: '#aicsActionsInner .aics-act.primary', loading: '.aics-result-loading.show', error: '.error-box.show',
    result: '#promptResult',
  },
  {
    slug: 'voice', path: '/app/voice', title: 'Voice Studio',
    setup: async (page) => {
      // V2.1: single page with mode chips - text-to-voice is the default chip
      await page.click('#voiceChips .vchip >> nth=0');
      await page.waitForSelector('#ttsText', { timeout: 5000 });
    },
    // Step 1 (Input) -> Step 2 (Format): sticky primary button is "Next", then "Generate"
    advance: async (page) => {
      await page.click('#aicsActionsInner .aics-act.primary', { timeout: 8000 });
      await page.waitForSelector('#voiceName', { timeout: 5000 });
    },
    idea: ['#ttsText', 'မင်္ဂလာပါ။ ဒီအသံဟာ E2E စမ်းသပ်မှုအတွက် ဖြစ်ပါတယ်။'],
    action: '#aicsActionsInner .aics-act.primary', loading: '.aics-result-loading.show', error: '#voiceWorkflowBody .error-box',
    result: '#voiceWorkflowBody',
  },
  {
    slug: 'shop', path: '/app/shop', title: 'Shop Studio',
    setup: async (page) => {
      await page.fill('#prodDesc', 'တာရှည်ခံပြီး ဈေးနှုန်းသင့်တည့်သော ဆန်အိုး');
    },
    idea: ['#prodName', 'Pearl Rice Cooker 1.8L'],
    action: '#aicsActionsInner .aics-act.primary', loading: '.aics-result-loading.show', error: '.error-box.show',
    result: '#resultContent',
  },
];

let passed = 0, failed = 0, blocked = 0;
const failures = [];
function record(name, ok, extra) {
  if (ok) { passed++; console.log('    ✔ ' + name); }
  else { failed++; failures.push(name + (extra ? ' — ' + extra : '')); console.log('    ✘ ' + name + (extra ? ' — ' + extra : '')); }
}

async function checkStudio(browser, base, token, spec) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: 'aics_token', value: token, domain: '127.0.0.1', path: '/' }]);
  await ctx.addInitScript((t) => {
    localStorage.setItem('aics_token', t);
    localStorage.setItem('aics_email', 'e2e@test.local');
    localStorage.setItem('aics_plan', 'FREE');
  }, token);
  const page = await ctx.newPage();

  console.log('\n  [' + spec.slug.toUpperCase() + '] ' + spec.path);

  // 1. page loads + correct route
  const resp = await page.goto(base + spec.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
  record('page loads (HTTP 200)', !!resp && resp.status() === 200, 'status=' + (resp && resp.status()));
  await page.waitForTimeout(600);
  record('correct route', page.url().includes(spec.path), page.url());
  record('title', (await page.title() || '').includes('AI Creative Studio'), await page.title());

  // 2. main UI renders
  record('main UI renders (#aicsApp)', await page.isVisible('#aicsApp'));
  record('sidebar renders', await page.locator('#sidebar, .sidebar').count() > 0);

  // 3. per-studio setup (e.g. voice mode selection, shop extra field)
  if (spec.setup) await spec.setup(page);

  // 4. stepper renders (voice: after a mode is entered; others: on page init)
  record('stepper renders', await page.locator('#aicsStepper .aics-step-btn, #voiceStepper .vstep').count() > 0);

  // 5. required controls exist
  record('idea control exists', await page.locator(spec.idea[0]).count() === 1);
  record('action control exists', await page.locator(spec.action).count() === 1);

  // 6. input works
  await page.fill(spec.idea[0], spec.idea[1]);
  record('input works', (await page.inputValue(spec.idea[0])).trim() === spec.idea[1]);

  // 6b. multi-step studios (voice V2.1): move to the step that owns the main action
  if (spec.advance) await spec.advance(page);

  // 5. main action + loading state (MutationObserver catches brief loading)
  await page.evaluate(() => {
    window.__aicsLoadingSeen = false;
    if (window.__aicsObs) try { window.__aicsObs.disconnect(); } catch (_) {}
    window.__aicsObs = new MutationObserver(() => {
      if (window.__aicsLoadingSeen) return;
      document.querySelectorAll('.aics-result-loading.show, .loading.show, .aics-work .loading.show')
        .forEach((el) => { try { if (el.getBoundingClientRect().height > 0) window.__aicsLoadingSeen = true; } catch (_) {} });
    });
    window.__aicsObs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  });

  let clickErr = null;
  try { await page.click(spec.action, { timeout: 8000 }); }
  catch (e) { clickErr = e.message; }
  record('main action click fires', !clickErr, clickErr || '');

  // 6. error state (honest: no AI credentials → friendly error UI)
  let errSeen = false;
  try {
    await page.waitForSelector(spec.error, { state: 'visible', timeout: 15000 });
    errSeen = true;
  } catch (_) {}
  await page.waitForTimeout(300);
  record('error state works (no-API-key failure shown)', errSeen);

  // 7. loading state was seen
  const loadingSeen = await page.evaluate(() => window.__aicsLoadingSeen);
  record('loading state works', !!loadingSeen);

  // 8. result UI exists (real result content is BLOCKED without AI credentials)
  record('result UI exists', await page.locator(spec.result).count() > 0);

  // 9. navigation works
  const navLink = page.locator('#sidebar a[href="/app"], .sidebar a[href="/app"], .nav-item[href="/app"]').first();
  if (await navLink.count() > 0) {
    await navLink.click().catch(() => {});
    await page.waitForTimeout(800);
    record('navigation works (sidebar → /app)', page.url().includes('/app') && !page.url().includes(spec.path));
  } else {
    record('navigation works (sidebar → /app)', false, 'no home link found');
  }

  // 10. refresh does not break page
  await page.goto(base + spec.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(600);
  record('refresh does not break page', await page.isVisible('#aicsApp'));

  await ctx.close();
}

const { chromium } = await loadPlaywright();
const { server, url, token } = await startE2EServer(0);

try {
  const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM_PATH });
  console.log('E2E server: ' + url + ' · browser: chromium (headless)');
  for (const spec of STUDIOS) {
    await checkStudio(browser, url, token, spec);
  }
  await browser.close();
} finally {
  server.close();
}

console.log('\n=== E2E RESULT: ' + passed + ' passed, ' + failed + ' failed, result-state BLOCKED (no AI credentials) ===');
if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
