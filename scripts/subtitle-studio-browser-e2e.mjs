#!/usr/bin/env node
/**
 * Subtitle Studio browser smoke and API-contract test.
 * Uses the repository's in-process E2E worker server and a real Chromium
 * browser. Media is a synthetic test fixture; Subtitle API requests are
 * intercepted and mocked. No real user media or AI provider is contacted.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';

const url = process.env.AICS_BASE_URL || 'http://127.0.0.1:8787';
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
  const homePage = await homeContext.newPage();
  const email = 'subtitle-browser-e2e-' + randomUUID() + '@example.invalid';
  const signup = await homePage.request.post(url + '/api/auth/signup', {
    data: { name: 'Subtitle Browser E2E', email, password: 'local-e2e-password-2026' },
  });
  assert.equal(signup.status(), 201, 'Local Subtitle E2E account should be created');
  const account = await signup.json();
  assert.ok(account.user_id, 'Signup should return a local test user ID');
  const token = String(account.token || '');
  assert.ok(token, 'Local signup should return a signed session token');
  await homeContext.addCookies([{
    name: 'aics_token', value: token, url,
    httpOnly: true, secure: new URL(url).protocol === 'https:', sameSite: 'Lax',
  }]);
  await homePage.addInitScript((value) => {
    localStorage.setItem('aics_token', value);
    localStorage.setItem('aics_plan', 'FREE');
  }, token);
  const homeResponse = await homePage.goto(url + '/app', { waitUntil: 'domcontentloaded' });
  check(
    'Home Dashboard returns HTTP 200',
    homeResponse?.status() === 200,
    'HTTP ' + (homeResponse?.status() ?? 'no response') +
      ', finalPath=' + new URL(homePage.url()).pathname,
  );
  check('Home Dashboard response URL is /app', new URL(homePage.url()).pathname === '/app');
  const card = homePage.locator('[data-studio="subtitle"][data-home-action="navigate-studio"]');
  check('Subtitle Studio card is present', await card.count() === 1);
  await card.click();
  await homePage.waitForURL('**/app/subtitle');
  check('Home card navigates to Subtitle Studio', new URL(homePage.url()).pathname === '/app/subtitle');
  await homeContext.close();

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 900, columns: 2 },
    { name: 'tablet', width: 820, height: 1180, columns: 2 },
    { name: 'mobile', width: 390, height: 844, columns: 1 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    await context.addCookies([{
      name: 'aics_token', value: token, url,
      httpOnly: true, secure: new URL(url).protocol === 'https:', sameSite: 'Lax',
    }]);
    await context.addInitScript((value) => {
      localStorage.setItem('aics_token', value);
      localStorage.setItem('aics_plan', 'PRO');
    }, token);
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

    const editor = page.locator('#subtitleSrtInput');
    const translationInput = page.locator('#subtitleTranslationInput');
    const translatedOutput = page.locator('#subtitleTranslatedOutput');
    const sendToTranslation = page.locator('#subtitleSendToTranslationBtn');
    const sendToEditor = page.locator('#subtitleSendTranslatedToEditorBtn');
    const sampleSrt = '1\n00:00:00,000 --> 00:00:02,000\nမင်္ဂလာပါ';

    check(viewport.name + ': editor-to-translation controls exist',
      await sendToTranslation.count() === 1 && await sendToEditor.count() === 1);
    await editor.fill(sampleSrt);
    await sendToTranslation.click();
    check(viewport.name + ': edited SRT is copied exactly to translation input',
      await translationInput.inputValue() === sampleSrt);
    check(viewport.name + ': editor-to-translation success status is shown',
      (await page.locator('#subtitleStatus').textContent()).includes('ပို့ပြီးပါပြီ'));

    await translationInput.fill('KEEP TRANSLATION INPUT');
    await editor.fill('   ');
    await sendToTranslation.click();
    check(viewport.name + ': empty editor does not overwrite translation input',
      await translationInput.inputValue() === 'KEEP TRANSLATION INPUT');
    check(viewport.name + ': empty editor shows an error',
      await page.locator('#subtitleStatus').getAttribute('data-state') === 'error');

    const translatedSrt = '1\n00:00:00,000 --> 00:00:02,000\n你好';
    await translatedOutput.evaluate((element, value) => { element.value = value; }, translatedSrt);
    await sendToEditor.click();
    check(viewport.name + ': translated SRT is copied exactly back to editor',
      await editor.inputValue() === translatedSrt);
    check(viewport.name + ': translated output remains unchanged after copy',
      await translatedOutput.inputValue() === translatedSrt);
    check(viewport.name + ': editor receives focus after translated SRT copy',
      await editor.evaluate(element => document.activeElement === element));
    check(viewport.name + ': editor state updates after translated SRT copy',
      await editor.inputValue() === translatedSrt);
    check(viewport.name + ': translation-to-editor success status is shown',
      (await page.locator('#subtitleStatus').textContent()).includes('ပြန်ပို့ပြီးပါပြီ'));

    await editor.fill('KEEP EDITOR CONTENT');
    await translatedOutput.evaluate(element => { element.value = '  '; });
    await sendToEditor.click();
    check(viewport.name + ': empty translated output does not overwrite editor',
      await editor.inputValue() === 'KEEP EDITOR CONTENT');
    check(viewport.name + ': empty translated output shows an error',
      await page.locator('#subtitleStatus').getAttribute('data-state') === 'error');


    // Intercept the Worker API so browser tests verify request contracts and UI
    // behavior without contacting an AI provider or transmitting real media.
    const generatedSrt = '1\\n00:00:00,000 --> 00:00:02,000\\nGenerated subtitle';
    const translatedApiSrt = '1\\n00:00:00,000 --> 00:00:02,000\\nAPI translation';
    const fakeAudio = Buffer.from('subtitle-browser-e2e-audio-fixture');
    const knownText = 'မင်္ဂလာပါ - API fixture';
    let generationMode = 'success';
    let translationMode = 'success';
    let generationRequests = [];
    let translationRequests = [];

    await page.route('**/api/studio/subtitle/srt', async (route) => {
      const request = route.request();
      generationRequests.push({
        method: request.method(),
        headers: request.headers(),
        body: request.postDataJSON(),
      });
      if (generationMode === 'error') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'srt_error', detail: 'private provider detail' }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, srt: generatedSrt }),
      });
    });

    await page.route('**/api/studio/subtitle/translate-srt', async (route) => {
      const request = route.request();
      translationRequests.push({
        method: request.method(),
        headers: request.headers(),
        body: request.postDataJSON(),
      });
      if (translationMode === 'error') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'translate_error', detail: 'private provider detail' }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, srt: translatedApiSrt }),
      });
    });

    const mediaInput = page.locator('#subtitleMediaFile');

    // Empty selection and oversized files must be rejected before any API call.
    await mediaInput.setInputFiles([]);
    await page.locator('#subtitleGenerateBtn').click();
    check(viewport.name + ': missing media is rejected before API request',
      generationRequests.length === 0 &&
      await page.locator('#subtitleStatus').getAttribute('data-state') === 'error' &&
      (await page.locator('#subtitleStatus').textContent()).includes('ဖိုင် ရွေးပေးပါ'));

    await mediaInput.setInputFiles({
      name: 'subtitle-too-large.wav',
      mimeType: 'audio/wav',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
    await page.locator('#subtitleGenerateBtn').click();
    check(viewport.name + ': media larger than 5MB is rejected before API request',
      generationRequests.length === 0 &&
      await page.locator('#subtitleStatus').getAttribute('data-state') === 'error' &&
      (await page.locator('#subtitleStatus').textContent()).includes('5MB'));

    await page.locator('#subtitleKnownText').fill(knownText);
    await page.locator('#subtitleMediaFile').setInputFiles({
      name: 'subtitle-fixture.wav',
      mimeType: 'audio/wav',
      buffer: fakeAudio,
    });
    await page.locator('#subtitleGenerateBtn').click();
    await page.waitForFunction(() => document.getElementById('subtitleSrtInput')?.value.includes('Generated subtitle'));
    check(viewport.name + ': Generate SRT API is called once', generationRequests.length === 1);
    const generationRequest = generationRequests[0];
    check(viewport.name + ': Generate SRT uses POST and Bearer authorization',
      generationRequest.method === 'POST' && /^Bearer\s+\S+/.test(generationRequest.headers.authorization || ''));
    check(viewport.name + ': Generate SRT sends expected media and known-text payload',
      generationRequest.body.audioBase64 === fakeAudio.toString('base64') &&
      generationRequest.body.mimeType === 'audio/wav' &&
      generationRequest.body.knownText === knownText &&
      generationRequest.body.type === '2');
    check(viewport.name + ': Generate SRT response populates editor',
      await editor.inputValue() === generatedSrt);

    // The exact 5MB boundary is permitted by the client-side size guard.
    const exactLimitResponse = page.waitForResponse(response =>
      response.url().includes('/api/studio/subtitle/srt') && response.request().method() === 'POST');
    await mediaInput.setInputFiles({
      name: 'subtitle-exact-limit.wav',
      mimeType: 'audio/wav',
      buffer: Buffer.alloc(5 * 1024 * 1024),
    });
    await page.locator('#subtitleGenerateBtn').click();
    await exactLimitResponse;
    check(viewport.name + ': exactly 5MB media reaches the mocked API',
      generationRequests.length === 2 &&
      generationRequests[1].body.audioBase64.length === Math.ceil((5 * 1024 * 1024) / 3) * 4);

    await translationInput.fill(sampleSrt);
    await page.locator('#subtitleTranslationDirection').selectOption('CN_TO_MY');
    await page.locator('#subtitleTranslateBtn').click();
    await page.waitForFunction(() => document.getElementById('subtitleTranslatedOutput')?.value.includes('API translation'));
    check(viewport.name + ': Translate SRT API is called once', translationRequests.length === 1);
    const translationRequest = translationRequests[0];
    check(viewport.name + ': Translate SRT uses POST and Bearer authorization',
      translationRequest.method === 'POST' && /^Bearer\s+\S+/.test(translationRequest.headers.authorization || ''));
    check(viewport.name + ': Translate SRT sends exact text, direction, and type',
      translationRequest.body.srtText === sampleSrt &&
      translationRequest.body.direction === 'CN_TO_MY' &&
      translationRequest.body.type === '2');
    check(viewport.name + ': Translate SRT response populates output',
      await translatedOutput.inputValue() === translatedApiSrt);

    generationMode = 'error';
    await page.locator('#subtitleGenerateBtn').click();
    await page.waitForFunction(() => document.getElementById('subtitleStatus')?.getAttribute('data-state') === 'error');
    const generationErrorStatus = await page.locator('#subtitleStatus').textContent();
    check(viewport.name + ': Generate SRT API error is shown safely',
      generationErrorStatus.includes('SRT ဖန်တီးရာတွင် အခက်အခဲ') &&
      !generationErrorStatus.includes('private provider detail'));

    translationMode = 'error';
    await page.locator('#subtitleTranslateBtn').click();
    await page.waitForFunction(() => document.getElementById('subtitleStatus')?.getAttribute('data-state') === 'error');
    const translationErrorStatus = await page.locator('#subtitleStatus').textContent();
    check(viewport.name + ': Translate SRT API error is shown safely',
      translationErrorStatus.includes('SRT ဘာသာပြန်ရာတွင် အခက်အခဲ') &&
      !translationErrorStatus.includes('private provider detail'));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#subtitleWorkflow').waitFor({ state: 'visible' });
    check(viewport.name + ': Subtitle UI survives refresh', await page.locator('#subtitleWorkflow').isVisible());
    await context.close();
  }

  console.log('Subtitle Studio browser smoke test passed (' + checks.length + ' checks).');
} finally {
  if (browser) await browser.close();
}
