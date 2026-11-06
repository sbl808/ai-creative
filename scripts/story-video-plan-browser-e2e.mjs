import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { Script } from 'node:vm';

const baseURL = process.env.AICS_BASE_URL || 'http://127.0.0.1:8787';
const signingKey = String(process.env.AICS_TEST_SESSION_SIGNING_KEY || '').trim();
assert.ok(signingKey.length >= 32, 'A local-only test signing key is required');

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function createProTestToken(userId, email) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    sub: String(userId),
    email,
    plan: 'PRO',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = header + '.' + payload;
  const signature = createHmac('sha256', signingKey).update(unsigned).digest('base64url');
  return unsigned + '.' + signature;
}

function safeUrlPath(value) {
  try {
    const url = new URL(value);
    return url.origin + url.pathname;
  } catch {
    return '[invalid-url]';
  }
}

async function collectInlineScriptDiagnostics(page) {
  const scripts = await page.evaluate(() => Array.from(document.scripts).map((script, index) => ({
    index,
    type: (script.getAttribute('type') || '').trim().toLowerCase(),
    src: script.src || '',
    noncePresent: !!script.nonce,
    source: script.src ? '' : (script.textContent || ''),
  })));

  const inventory = [];
  const syntaxErrors = [];
  for (const script of scripts) {
    inventory.push({
      index: script.index,
      type: script.type || 'classic',
      src: script.src ? safeUrlPath(script.src) : null,
      noncePresent: script.noncePresent,
      inline: !script.src,
      sourceLength: script.source.length,
    });
    if (script.src || (script.type && ![
      'text/javascript',
      'application/javascript',
      'text/ecmascript',
      'application/ecmascript',
    ].includes(script.type))) continue;

    try {
      new Script(script.source, { filename: 'inline-script-' + script.index });
    } catch (error) {
      const message = String(error && error.message || error);
      const match = message.match(/:(\d+)(?::(\d+))?/);
      syntaxErrors.push({
        index: script.index,
        error: message.slice(0, 300),
        line: match ? Number(match[1]) : null,
        column: match && match[2] ? Number(match[2]) : null,
      });
    }
  }
  return { scriptCount: scripts.length, inventory, syntaxErrors };
}

const browser = await chromium.launch({ headless: true });
let context;
try {
  context = await browser.newContext();
  const page = await context.newPage();
  const browserErrors = [];
  const networkDiagnostics = [];
  page.on('pageerror', (error) => {
    const name = String(error && error.name || 'JavaScript error');
    const rawMessage = String(error && error.message || '');
    const safeMessage = name === 'SyntaxError' && /Unexpected token/.test(rawMessage)
      ? 'SyntaxError: Unexpected token'
      : name;
    const stack = String(error && error.stack || '');
    const frame = stack.split('\n').slice(1).find((line) => /https?:\/\//.test(line)) || '';
    const match = frame.match(/(https?:\/\/[^\s)]+):(\d+):(\d+)/);
    browserErrors.push({
      type: 'pageerror',
      name,
      message: safeMessage,
      url: match ? safeUrlPath(match[1]) : null,
      line: match ? Number(match[2]) : null,
      column: match ? Number(match[3]) : null,
    });
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const location = message.location() || {};
    const rawMessage = String(message.text() || '');
    const safeMessage = /Unexpected token\s+['"]?</.test(rawMessage)
      ? 'SyntaxError: Unexpected token <'
      : (/SyntaxError/.test(rawMessage) ? 'SyntaxError' : 'Console error (details withheld)');
    browserErrors.push({
      type: 'console',
      message: safeMessage,
      url: location.url ? safeUrlPath(location.url) : null,
      line: Number.isInteger(location.lineNumber) ? location.lineNumber : null,
      column: Number.isInteger(location.columnNumber) ? location.columnNumber : null,
    });
  });
  page.on('requestfailed', (request) => {
    const resourceType = request.resourceType();
    if (!['document', 'script'].includes(resourceType)) return;
    networkDiagnostics.push({
      type: 'requestfailed',
      resourceType,
      url: safeUrlPath(request.url()),
      failure: String(request.failure()?.errorText || 'unknown').slice(0, 250),
    });
  });
  page.on('response', (response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    if (!['document', 'script'].includes(resourceType)) return;
    networkDiagnostics.push({
      type: 'response',
      resourceType,
      url: safeUrlPath(response.url()),
      status: response.status(),
      contentType: String(response.headers()['content-type'] || '').slice(0, 120),
    });
  });
  const email = 'browser-e2e-' + randomUUID() + '@example.invalid';
  const signup = await page.request.post(baseURL + '/api/auth/signup', {
    data: { name: 'Browser E2E', email, password: 'local-e2e-password-2026' },
  });
  assert.equal(signup.status(), 201, 'Local test account should be created');
  const account = await signup.json();
  assert.ok(account.user_id, 'Signup should return a local test user ID');

  const token = createProTestToken(account.user_id, email);
  await context.addCookies([{
    name: 'aics_token',
    value: token,
    url: baseURL,
    httpOnly: true,
    secure: new URL(baseURL).protocol === 'https:',
    sameSite: 'Lax',
  }]);
  await page.addInitScript((value) => {
    localStorage.setItem('aics_token', value);
    localStorage.setItem('aics_plan', 'PRO');
  }, token);

  await page.goto(baseURL + '/app/ideas');
  await page.locator('h1').filter({ hasText: 'Idea Workspace' }).waitFor();
  const storageReady = await page.waitForFunction(() =>
    !!(window.AICS_HANDOFFS && typeof window.AICS_HANDOFFS.create === 'function'),
  null, { timeout: 10000 }).then(() => true).catch(() => false);
  if (!storageReady) {
    const state = await page.evaluate(() => ({
      url: location.pathname,
      readyState: document.readyState,
      handoffsApi: typeof window.AICS_HANDOFFS,
      ideasApi: typeof window.AICS_IDEAS,
      scriptCount: document.scripts.length,
      inlineScriptsWithNonce: Array.from(document.scripts).filter((script) => !script.src && !!script.nonce).length,
    }));
    const scripts = await collectInlineScriptDiagnostics(page);
    throw new Error('Idea Workspace browser bootstrap incomplete: ' +
      JSON.stringify({
        state,
        scripts,
        browserErrors: browserErrors.slice(0, 12),
        networkDiagnostics: networkDiagnostics.slice(0, 30),
      }));
  }

  const idea = {
    title: 'မိုးရွာသောညက မီးအိမ်',
    concept: 'ရွာလေးတစ်ရွာတွင် ပျောက်ဆုံးနေသော မီးအိမ်တစ်လုံးက လျှို့ဝှက်ချက်ကို ဖော်ထုတ်ပေးသည်။',
    hook: 'ညသန်းခေါင်မှာ မီးအိမ်က သူ့အလိုလို လင်းလာခဲ့တယ်။',
    outline: 'ကလေးတစ်ဦးက မီးအိမ်ကို လိုက်ရှာရင်း မိသားစုအတိတ်ကို သိလာသည်။',
    suggestedStudio: 'Story',
  };
  const handoff = await page.evaluate((payload) => {
    return window.AICS_HANDOFFS.create({
      contractVersion: 1,
      source: 'ideas',
      target: 'story',
      payload,
    });
  }, idea);

  // Keep the Story failure report scoped to the page under investigation.
  browserErrors.length = 0;
  networkDiagnostics.length = 0;
  await page.goto(baseURL + '/app/story?handoff=' + encodeURIComponent(handoff.id));

  // The shared sidebar script installs IndexedDB APIs. Wait for that bootstrap
  // before polling the handoff record; do not treat a hidden panel as the first
  // signal that the record has failed to load.
  const storageApiReady = await page.waitForFunction(() =>
    !!(window.AICS_HANDOFFS && typeof window.AICS_HANDOFFS.get === 'function' &&
      window.AICS_SESSIONS && typeof window.AICS_SESSIONS.list === 'function'),
  null, { timeout: 10000 }).then(() => true).catch(() => false);

  const handoffRecordReady = storageApiReady && await page.waitForFunction(async (id) => {
    try {
      const record = await window.AICS_HANDOFFS.get(id);
      return !!record && record.contractVersion === 1 &&
        record.source === 'ideas' && record.target === 'story';
    } catch (error) {
      return false;
    }
  }, handoff.id, { timeout: 10000 }).then(() => true).catch(() => false);

  const handoffRendered = handoffRecordReady && await page.locator('#ideaHandoffPanel')
    .waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  const summaryRendered = handoffRendered && await page.locator('#ideaHandoffSummary').getByText(idea.title)
    .waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);

  if (!summaryRendered) {
    const state = await page.evaluate(async (id) => {
      const panel = document.getElementById('ideaHandoffPanel');
      const summary = document.getElementById('ideaHandoffSummary');
      let record = null;
      let readError = '';
      try {
        const value = window.AICS_HANDOFFS && await window.AICS_HANDOFFS.get(id);
        record = value ? {
          contractVersion: value.contractVersion,
          source: value.source,
          target: value.target,
          payloadKeys: Object.keys(value.payload || {}),
        } : null;
      } catch (error) { readError = String(error && error.message || error); }
      return {
        url: location.pathname,
        handoffsApi: typeof window.AICS_HANDOFFS,
        sessionsApi: typeof window.AICS_SESSIONS,
        storageApiReady: !!(window.AICS_HANDOFFS && typeof window.AICS_HANDOFFS.get === 'function' &&
          window.AICS_SESSIONS && typeof window.AICS_SESSIONS.list === 'function'),
        handoffRecordReady: !!record && record.contractVersion === 1 &&
          record.source === 'ideas' && record.target === 'story',
        record,
        readError,
        panelExists: !!panel,
        panelClass: panel ? panel.className : '',
        summaryTextLength: summary ? (summary.textContent || '').length : 0,
        toastTextLength: (document.getElementById('toast')?.textContent || '').length,
      };
    }, handoff.id);
    const scripts = await collectInlineScriptDiagnostics(page);
    throw new Error('Story Idea Handoff bootstrap/fetch/render incomplete: ' +
      JSON.stringify({
        state,
        scripts,
        browserErrors: browserErrors.slice(0, 20),
        networkDiagnostics: networkDiagnostics.slice(0, 40),
      }));
  }

  const sessionsBeforeAccept = await page.evaluate(async () => window.AICS_SESSIONS.list({ limit: 50 }));
  assert.equal(sessionsBeforeAccept.items.length, 0, 'Receiving an Idea must not auto-create a Story Draft');

  await page.locator('#acceptIdeaHandoffBtn').click();
  await page.locator('#ideaHandoffPanel').waitFor({ state: 'hidden' });

  const storySession = await page.evaluate(async () => {
    const result = await window.AICS_SESSIONS.list({ limit: 50 });
    return result.items.find((item) => item.studio === 'STORY') || null;
  });
  assert.ok(storySession, 'Explicit acceptance should create a Story Draft');
  assert.match(storySession.draft.fields['0'], /မိုးရွာသောညက မီးအိမ်/);
  assert.match(storySession.draft.fields['0'], /ရွာလေးတစ်ရွာ/);

  const storyText = 'မိုးရွာသောညတွင် မီးအိမ်လေးတစ်လုံးသည် လမ်းဟောင်းကို လင်းပေးခဲ့သည်။';
  await page.evaluate(async ({ id, story }) => {
    const current = await window.AICS_SESSIONS.get(id);
    await window.AICS_SESSIONS.update(id, {
      draft: Object.assign({}, current.draft, { story }),
    });
    await window.studioLoadSession(id);
    if (window.studioForceGoStep) window.studioForceGoStep(2);
    else if (window.studioGoStep) window.studioGoStep(2);
  }, { id: storySession.id, story: storyText });

  await page.locator('#storyResult').waitFor({ state: 'visible' });
  const storyHandoffState = await page.evaluate(() => ({
    isPro: typeof isPro !== 'undefined' && isPro === true,
    currentStory: typeof currentStory === 'string' ? currentStory : '',
    resultText: document.getElementById('storyResult')?.value || '',
  }));
  assert.equal(storyHandoffState.isPro, true, 'Browser fixture should enable the Story Video Pro feature gate');
  assert.equal(storyHandoffState.currentStory, storyText, 'Story Studio should restore the completed Story');
  await page.locator('button[data-aics-action="go-to-video-plan"]').click();
  await page.waitForTimeout(1200);
  if (!/\/app\/story-video-plan\?session=/.test(page.url())) {
    const visibleText = await page.locator('body').innerText();
    throw new Error('Story-to-Video-Plan navigation did not complete. Current URL: ' + page.url() +
      '. Page message: ' + visibleText.slice(-800));
  }
  await page.waitForURL(/\/app\/story-video-plan\?session=/, { timeout: 10000 });
  await page.locator('#videoStoryInput').waitFor();
  await page.waitForFunction(() => window.AICS_STORY_VIDEO_PLAN_STATE && window.AICS_STORY_VIDEO_PLAN_STATE.state.ready);
  assert.equal(await page.locator('#videoStoryInput').inputValue(), storyText,
    'Video Plan should receive the latest Story text');

  const environmentNotes = 'မိုးစိုနေသော သစ်တောလမ်း၊ အဝါရောင် မီးအိမ်အလင်း';
  await page.locator('#vidAdvToggle').click();
  await page.waitForFunction(() => {
    const toggle = document.getElementById('vidAdvToggle');
    const panel = document.getElementById('vidAdvFields');
    return !!toggle && !!panel && toggle.getAttribute('aria-expanded') === 'true' &&
      panel.classList.contains('open') && getComputedStyle(panel).display !== 'none';
  }, null, { timeout: 10000 });
  await page.locator('#vidEnvDetails').fill(environmentNotes);
  await page.waitForTimeout(1200);

  const planId = await page.evaluate(() => new URLSearchParams(location.search).get('plan'));
  assert.ok(planId, 'Video Plan should create its own IndexedDB session');
  const planSession = await page.evaluate(async (id) => window.AICS_SESSIONS.get(id), planId);
  assert.equal(planSession.studio, 'STORY_VIDEO_PLAN');
  assert.equal(planSession.draft.form.environmentDetails, environmentNotes);

  await page.reload();
  await page.waitForFunction(() => window.AICS_STORY_VIDEO_PLAN_STATE && window.AICS_STORY_VIDEO_PLAN_STATE.state.ready);
  assert.equal(await page.locator('#vidEnvDetails').inputValue(), environmentNotes,
    'Video Plan settings should restore after reload');
  assert.equal(await page.locator('#videoStoryInput').inputValue(), storyText,
    'Video Plan story text should restore after reload');

  const sourceAfterPlanSave = await page.evaluate(async (id) => window.AICS_SESSIONS.get(id), storySession.id);
  assert.equal(sourceAfterPlanSave.draft.story, storyText,
    'Saving Video Plan must not mutate the source Story Draft');
  assert.equal(sourceAfterPlanSave.studio, 'STORY');

  const localStorageContainsStory = await page.evaluate((text) => {
    return Object.keys(localStorage).some((key) => String(localStorage.getItem(key) || '').includes(text));
  }, storyText);
  assert.equal(localStorageContainsStory, false,
    'User Story content must not be copied into localStorage');

  console.log('Story Idea → Story Draft → Story Video Plan browser E2E passed.');
} finally {
  if (context) await context.close().catch(() => {});
  await browser.close();
}
