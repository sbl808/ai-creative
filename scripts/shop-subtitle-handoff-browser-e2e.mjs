#!/usr/bin/env node
/**
 * Shop → Subtitle IndexedDB handoff end-to-end browser test.
 * Uses synthetic audio and mocked Shop TTS / Subtitle SRT endpoints.
 * No real user media or AI provider is contacted.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';

const url = process.env.AICS_BASE_URL || 'http://127.0.0.1:8787';
const fakeAudio = Buffer.from('shop-subtitle-handoff-e2e-audio');
const audioBase64 = fakeAudio.toString('base64');
const generatedSrt = '1\\n00:00:00,000 --> 00:00:02,000\\nHandoff subtitle';
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const email = 'shop-subtitle-handoff-' + randomUUID() + '@example.invalid';
  const signup = await page.request.post(url + '/api/auth/signup', {
    data: { name: 'Shop Subtitle Handoff E2E', email, password: 'local-e2e-password-2026' },
  });
  assert.equal(signup.status(), 201, 'Local E2E account should be created');
  const account = await signup.json();
  const token = String(account.token || '');
  assert.ok(token, 'Local signup should return a session token');
  await context.addCookies([{
    name: 'aics_token', value: token, url,
    httpOnly: true, secure: new URL(url).protocol === 'https:', sameSite: 'Lax',
  }]);
  await page.addInitScript((value) => {
    localStorage.setItem('aics_token', value);
    localStorage.setItem('aics_plan', 'PRO');
    window.AICS_BYOK = {
      withGeminiKey: async (body) => ({ ...body, apiKey: 'shop-subtitle-e2e-key' }),
    };
  }, token);

  const shopResponse = await page.goto(url + '/app/shop', { waitUntil: 'domcontentloaded' });
  assert.equal(shopResponse?.status(), 200, 'Shop Studio should load');
  await page.locator('#viewAudio').waitFor({ state: 'attached' });
  await page.evaluate((data) => {
    // Seed a synthetic completed Shop Audio result; the test focuses on persistence and handoff.
    shopState.content.result = 'E2E product content fixture';
    shopState.mainStep = 2;
    shopState.view = 'audio';
    shopState.audio.step = 2;
    shopState.audio.result = {
      data, mimeType: 'audio/wav', url: '', voiceName: 'Puck'
    };
    if (window.studioForceGoStep) window.studioForceGoStep(2);
    showBranchViews();
  }, audioBase64);
  await page.waitForFunction(() => !document.getElementById('audioResultCard')?.classList.contains('shop-hidden'));
  const shopAudio = await page.evaluate(() => window.studioCollectDraft().shopState.audio.result);
  assert.equal(shopAudio.data, audioBase64, 'Synthetic TTS audio should appear in Shop result');

  await page.evaluate(() => handoffShopAudioToSubtitle());
  await page.waitForURL('**/app/subtitle?handoff=*');
  await page.locator('#subtitleHandoffStatus').waitFor({ state: 'visible' });
  await page.waitForFunction(() =>
    document.getElementById('subtitleHandoffStatus')?.getAttribute('data-state') === 'success');
  assert.match(await page.locator('#subtitleHandoffStatus').textContent(), /Audio ကို ချိတ်ဆက်ပြီးပါပြီ/);

  const handoffId = new URL(page.url()).searchParams.get('handoff');
  assert.ok(handoffId, 'Subtitle URL should contain the handoff ID');
  const stored = await page.evaluate(async (id) => {
    const handoff = await window.AICS_HANDOFFS.get(id);
    const draft = await window.AICS_STUDIO_DRAFTS.load('shop');
    return {
      handoff,
      audio: draft?.data?.shopState?.audio?.result,
      handoffHasAudioBytes: Object.prototype.hasOwnProperty.call(handoff?.payload || {}, 'audioBase64'),
    };
  }, handoffId);
  assert.equal(stored.handoff?.source, 'shop');
  assert.equal(stored.handoff?.target, 'subtitle');
  assert.equal(stored.handoff?.payload?.kind, 'shop-audio-reference');
  assert.equal(stored.audio?.data, audioBase64, 'Audio bytes should remain in the Shop IndexedDB draft');
  assert.equal(stored.handoffHasAudioBytes, false, 'Handoff record must not duplicate audio bytes');

  let srtRequest;
  await page.route('**/api/studio/subtitle/srt', async route => {
    srtRequest = route.request().postDataJSON();
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, srt: generatedSrt }),
    });
  });
  await page.locator('#subtitleGenerateBtn').click();
  await page.waitForFunction(() => document.getElementById('subtitleSrtInput')?.value.includes('Handoff subtitle'));
  assert.equal(srtRequest?.audioBase64, audioBase64, 'Subtitle Generate must send the verified Shop audio');
  assert.equal(srtRequest?.mimeType, 'audio/wav');
  assert.equal(srtRequest?.apiKey, 'shop-subtitle-e2e-key');

  const after = await page.evaluate(async (id) => ({
    handoff: await window.AICS_HANDOFFS.get(id),
    draft: await window.AICS_STUDIO_DRAFTS.load('shop'),
  }), handoffId);
  assert.ok(after.handoff, 'Handoff record should remain available after generation');
  assert.equal(after.draft?.data?.shopState?.audio?.result?.data, audioBase64,
    'Shop audio draft should remain unchanged after Subtitle generation');

  console.log('Shop → Subtitle Handoff browser E2E passed (handoff, IndexedDB reference, verified audio, SRT request, retention).');
  await context.close();
} finally {
  if (browser) await browser.close();
}
