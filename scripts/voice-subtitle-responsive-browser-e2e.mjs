#!/usr/bin/env node
/**
 * Voice → Subtitle responsive browser checks at mobile, tablet, and desktop widths.
 * Uses synthetic audio and a local IndexedDB handoff; no real media or AI provider.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';

const baseUrl = process.env.AICS_BASE_URL || 'http://127.0.0.1:8787';
const audioBase64 = Buffer.from('voice-subtitle-responsive-fixture').toString('base64');
const viewports = [
  { name: 'mobile', width: 390, height: 844, columns: 1 },
  { name: 'iPad', width: 820, height: 1180, columns: 2 },
  { name: 'desktop', width: 1280, height: 900, columns: 2 },
];
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = 'voice-subtitle-responsive-' + randomUUID() + '@example.invalid';
  const signup = await page.request.post(baseUrl + '/api/auth/signup', {
    data: { name: 'Voice Subtitle Responsive E2E', email, password: 'local-e2e-password-2026' },
  });
  assert.equal(signup.status(), 201, 'Local responsive E2E account should be created');
  const account = await signup.json();
  const token = String(account.token || '');
  assert.ok(token, 'Local signup should return a session token');
  await context.addCookies([{
    name: 'aics_token', value: token, url: baseUrl,
    httpOnly: true, secure: new URL(baseUrl).protocol === 'https:', sameSite: 'Lax',
  }]);
  await page.addInitScript(value => {
    localStorage.setItem('aics_token', value);
    localStorage.setItem('aics_plan', 'PRO');
  }, token);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const voiceResponse = await page.goto(baseUrl + '/app/voice', { waitUntil: 'domcontentloaded' });
    assert.equal(voiceResponse?.status(), 200, viewport.name + ': Voice Studio should load');
    await page.locator('#voiceWorkflowBody').waitFor({ state: 'attached' });

    await page.evaluate(data => {
      LAST_AUDIO = { base64: data, mime: 'audio/wav', url: '' };
      VOICE_STATE.audioResult = { data, mimeType: 'audio/wav' };
      VOICE_STATE.view = 'result';
      VOICE_STATE.resultKind = 'audio';
      VOICE_INPUTS.voice = 'Kore';
    }, audioBase64);
    await page.evaluate(() => handoffVoiceAudioToSubtitle());
    await page.waitForURL('**/app/subtitle?handoff=*');
    await page.locator('#subtitleHandoffStatus').waitFor({ state: 'visible' });
    await page.waitForFunction(() =>
      document.getElementById('subtitleHandoffStatus')?.textContent.includes('အောက်ပါခလုတ်ကို နှိပ်ပါ'));
    const connectButton = page.locator('#subtitleConnectVoiceHandoffBtn');
    assert.equal(await connectButton.isVisible(), true,
      viewport.name + ': Voice connect button should be visible before confirmation');

    const before = await page.evaluate(() => {
      const grid = document.querySelector('.subtitle-grid');
      const status = document.getElementById('subtitleHandoffStatus');
      const button = document.getElementById('subtitleConnectVoiceHandoffBtn');
      const rect = element => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, height: box.height };
      };
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        columns: grid ? getComputedStyle(grid).gridTemplateColumns.trim().split(/\\s+/).length : 0,
        status: rect(status),
        button: rect(button),
        buttonHidden: button.hidden,
        buttonText: button.textContent.trim(),
      };
    });
    assert.ok(before.documentWidth <= viewport.width,
      viewport.name + ': document must not overflow horizontally');
    assert.ok(before.bodyWidth <= viewport.width,
      viewport.name + ': body must not overflow horizontally');
    assert.equal(before.columns, viewport.columns,
      viewport.name + ': Subtitle cards should use the expected responsive column count');
    assert.ok(before.status.left >= 0 && before.status.right <= viewport.width,
      viewport.name + ': Handoff status should remain inside the viewport');
    assert.ok(before.button.left >= 0 && before.button.right <= viewport.width,
      viewport.name + ': Voice connect button should remain inside the viewport');
    assert.ok(before.button.height >= 44,
      viewport.name + ': Voice connect button should meet the 44px touch-height target');
    assert.ok(before.buttonText.length > 0 && !before.buttonHidden,
      viewport.name + ': Voice connect action should have an accessible visible label');

    await connectButton.click();
    await page.waitForFunction(() =>
      document.getElementById('subtitleHandoffStatus')?.textContent.includes('Voice မှ Audio ကို ချိတ်ဆက်ပြီးပါပြီ'));
    const after = await page.evaluate(() => ({
      status: document.getElementById('subtitleHandoffStatus')?.textContent || '',
      connectHidden: document.getElementById('subtitleConnectVoiceHandoffBtn')?.hidden,
      transcribeDisabled: document.getElementById('subtitleTranscribeBtn')?.disabled,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    assert.match(after.status, /Voice မှ Audio ကို ချိတ်ဆက်ပြီးပါပြီ/,
      viewport.name + ': connected status should be visible and readable');
    assert.equal(after.connectHidden, true,
      viewport.name + ': connect action should hide after successful connection');
    assert.equal(after.transcribeDisabled, false,
      viewport.name + ': transcription action should become available after connection');
    assert.ok(after.documentWidth <= viewport.width && after.bodyWidth <= viewport.width,
      viewport.name + ': connected state must not introduce horizontal overflow');

    console.log(viewport.name + ' (' + viewport.width + 'px): responsive handoff checks passed.');
  }

  console.log('Voice → Subtitle responsive browser E2E passed at 390px, 820px, and 1280px.');
  await context.close();
} finally {
  if (browser) await browser.close();
}
