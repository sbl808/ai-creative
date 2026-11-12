#!/usr/bin/env node
/**
 * Subtitle Studio browser smoke test.
 * Uses the repository's in-process E2E worker server and a real Chromium
 * browser. No media is uploaded and no AI processing/API action is invoked.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startE2EServer } from './e2e-server.mjs';

const { server, url, token } = await startE2EServer(0);
let browser;
const checks = [];
function check(name, condition, detail = '') {
  assert.ok(condition, name + (detail ? ': ' + detail : ''));
  checks.push(name);
  console.log('✔ ' + name);
}

try {
  browser = await chromium.launch({ headless: true });
  const homeContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await homeContext.addCookies([{
    name: 'aics_token', value: token, url,
    httpOnly: true, sameSite: 'Lax',
  }]);
  const homePage = await homeContext.newPage();
  // Attach the session cookie explicitly to the browser context and verify
  // the server-side session before asserting the protected Home route.
  const expectedCookie = 'aics_token=' + encodeURIComponent(token);
  await homePage.setExtraHTTPHeaders({ Cookie: expectedCookie });
  const authProbe = await homePage.request.get(url + '/app', {
    headers: { Cookie: expectedCookie },
    maxRedirects: 0,
  });
  const authProbeLocation = authProbe.headers().location || '';
  check(
    'E2E session is accepted by protected Home route',
    authProbe.status() === 200,
    'HTTP ' + authProbe.status() + ', redirect=' + (authProbeLocation ? new URL(authProbeLocation, url).pathname : 'none'),
  );
  const homeResponse = await homePage.goto(url + '/app', { waitUntil: 'domcontentloaded' });
  check(
    'Home Dashboard returns HTTP 200',
    homeResponse?.status() === 200,
    'HTTP ' + (homeResponse?.status() ?? 'no response') +
      ', finalPath=' + new URL(homePage.url()).pathname,
  );
  const card = homePage.locator('[data-studio="subtitle"][data-home-action="navigate-studio"]');
  check('Subtitle Studio card is present', await card.count() === 1);
  await card.click();
  await homePage.waitForURL('**/app/subtitle');
  check('Home card navigates to Subtitle Studio', new URL(homePage.url()).pathname === '/app/subtitle');
  await homeContext.close();

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 900, columns: 2 },
    { name: 'mobile', width: 390, height: 844, columns: 1 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    await context.addCookies([{
      name: 'aics_token', value: token, url,
      httpOnly: true, sameSite: 'Lax',
    }]);
    const page = await context.newPage();
    const response = await page.goto(url + '/app/subtitle', { waitUntil: 'domcontentloaded' });
    check(viewport.name + ': Subtitle page returns HTTP 200', response?.status() === 200);
    await page.locator('#subtitleWorkflow').waitFor({ state: 'visible' });
    check(viewport.name + ': page title is Subtitle Studio', (await page.title()).includes('Subtitle Studio'));
    check(viewport.name + ': media input exists', await page.locator('#subtitleMediaFile').count() === 1);
    check(viewport.name + ': SRT editor exists', await page.locator('#subtitleSrtInput').count() === 1);
    check(viewport.name + ': accessible status region exists',
      await page.locator('#subtitleStatus[aria-live="polite"]').count() === 1);

    const layout = await page.evaluate(() => {
      const grid = document.querySelector('.subtitle-grid');
      const media = document.querySelector('#subtitleMediaFile')?.getBoundingClientRect();
      const editor = document.querySelector('#subtitleSrtInput')?.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
        mediaFits: !!media && media.left >= 0 && media.right <= window.innerWidth,
        editorFits: !!editor && editor.left >= 0 && editor.right <= window.innerWidth,
      };
    });
    check(viewport.name + ': no horizontal overflow', layout.documentWidth <= layout.viewportWidth, JSON.stringify(layout));
    check(viewport.name + ': expected responsive columns', layout.columns === viewport.columns, JSON.stringify(layout));
    check(viewport.name + ': media input fits viewport', layout.mediaFits);
    check(viewport.name + ': SRT editor fits viewport', layout.editorFits);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#subtitleWorkflow').waitFor({ state: 'visible' });
    check(viewport.name + ': Subtitle UI survives refresh', await page.locator('#subtitleWorkflow').isVisible());
    await context.close();
  }

  console.log('Subtitle Studio browser smoke test passed (' + checks.length + ' checks).');
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
