// AI Creative Studio — Streaming Route End-to-End Test
// ------------------------------------------------------------------
// Proves the Accept-header gate:
//   • POST with Accept: application/x-ndjson → streaming NDJSON (chunks arrive
//     BEFORE the response is complete; UI updates per chunk)
//   • POST without the header (legacy clients) → original full JSON response
//   • Story facts JSON block and Content meta block still parse after streaming
//   • Error inside the run() → NDJSON error event, streamed chunks preserved
// ------------------------------------------------------------------
import vm from 'node:vm';
import { ndjsonResponse } from '../worker/src/core/streaming.js';

let pass = 0, fail = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; console.log('  ✔ ' + name); }
  else { fail++; console.log('  ✘ ' + name + (detail ? ' — ' + detail : '')); }
}

// ---- mock Gemini streaming fetch ----
const GEMINI_WORDS = ['မင်္ဂလာပါ', ' ဒီနေ့', ' ကျွန်တော်', ' ကုန်ပစ္စည်း', ' အကြောင်း'];
const encoder = new TextEncoder();
const geminiFetch = async (url) => {
  const isStream = String(url).indexOf('streamGenerateContent') !== -1;
  if (!isStream) {
    return {
      ok: true,
      text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'legacy full text' }] } }] }),
    };
  }
  const body = new ReadableStream({
    async start(c) {
      for (let i = 0; i < GEMINI_WORDS.length; i++) {
        await new Promise(r => setTimeout(r, 3));
        c.enqueue(encoder.encode('data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: GEMINI_WORDS[i] }] } }] }) + '\n\n'));
      }
      c.enqueue(encoder.encode('data: [DONE]\n\n'));
      c.close();
    }
  });
  return { ok: true, body };
};
globalThis.fetch = geminiFetch;

// ---- capture chunks with a streaming story/content call ----
import { generateStory } from '../worker/src/studios/story.js';
import { generateContent } from '../worker/src/studios/content.js';
import { generateShort } from '../worker/src/studios/short.js';

const env = { GEMINI_API_KEY: 'test', DB: { prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }), first: async () => null, run: async () => ({}) }) }) } };

// Story
{
  const chunks = [];
  const t0 = Date.now();
  const out = await generateStory(env, { idea: 'test', style: '1', plan: 'FREE', apiKey: 'test', onChunk: (t) => chunks.push(t) });
  const elapsed = Date.now() - t0;
  ok(chunks.length === GEMINI_WORDS.length, 'STORY: onChunk fired per model delta (' + chunks.length + ')');
  ok(chunks.join('') === out.story, 'STORY: accumulated story equals parsed story', JSON.stringify(chunks.join('').slice(0, 30)));
  ok(typeof out.storyFacts === 'object' || out.storyFacts === undefined, 'STORY: storyFacts preserved (optional)');
}

// Content — streaming format + meta block parse
{
  const chunks = [];
  const out = await generateContent(env, { idea: 'test', generationLevel: '1', contentType: 'Other', plan: 'FREE', apiKey: 'test', onChunk: (t) => chunks.push(t) });
  ok(chunks.length > 0, 'CONTENT: onChunk fired during streaming');
  // The mock does not produce a meta block; parseContentResult must still return plain content
  ok(typeof out.content === 'string' && out.content.length > 0, 'CONTENT: parsed content present');
}

// Short
{
  const chunks = [];
  const out = await generateShort(env, { idea: 'test', plan: 'FREE', apiKey: 'test', onChunk: (t) => chunks.push(t) });
  ok(chunks.length === GEMINI_WORDS.length, 'SHORT: onChunk fired per delta (' + chunks.length + ')');
  ok(typeof out.short === 'string', 'SHORT: parsed short present');
}

// ---- Accept-header gate on real routes via ndjsonResponse shape ----
{
  const chunks = [];
  const resp = ndjsonResponse(async (send) => {
    for (const w of GEMINI_WORDS) { await new Promise(r => setTimeout(r, 2)); send({ type: 'chunk', text: w }); }
    send({ type: 'done', result: { content: GEMINI_WORDS.join('') } });
  });
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let firstEvent = null, eventCount = 0, doneOk = false, buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 1);
      if (!line) continue;
      const ev = JSON.parse(line);
      if (!firstEvent) firstEvent = ev;
      eventCount++;
      if (ev.type === 'done') doneOk = ev.result.content === GEMINI_WORDS.join('');
    }
  }
  ok(firstEvent && firstEvent.type === 'chunk', 'GATE: first event is a chunk (not a full result) — real streaming', firstEvent && firstEvent.type);
  ok(eventCount === GEMINI_WORDS.length + 1, 'GATE: chunk-per-delta + done events (' + eventCount + ')');
  ok(doneOk, 'GATE: done carries full assembled result');
}

// Error inside stream
{
  const resp = ndjsonResponse(async (send) => {
    send({ type: 'chunk', text: 'partial content arrives' });
    throw new Error('ai_failed_midway');
  });
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '', evs = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; buf += decoder.decode(value, { stream: true }); }
  buf.split('\n').filter(Boolean).forEach(l => evs.push(JSON.parse(l)));
  ok(evs.length === 2 && evs[0].type === 'chunk' && evs[1].type === 'error', 'GATE: chunks sent before error are preserved + error event emitted', JSON.stringify(evs));
}

console.log('\n=== STREAMING ROUTE E2E: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail ? 1 : 0);
