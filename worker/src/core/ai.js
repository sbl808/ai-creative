// AI Creative Studio — AI Router (Gemini) — Phase 3d (text + image) + Phase GLOBAL RESULT STREAMING
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ===== Real-Time Streaming (GLOBAL RESULT UI) =====
// Reads Gemini :streamGenerateContent?alt=sse response body incrementally and
// calls onChunk(deltaText) for EVERY text part as it arrives from the model.
// Returns the fully accumulated text. No fake typing — this is real streaming.
async function readGeminiSseStream(res, onChunk) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (line.indexOf('data:') !== 0) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let data;
      try { data = JSON.parse(payload); } catch (e) { continue; }
      const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          if (p && typeof p.text === 'string' && p.text) {
            full += p.text;
            if (typeof onChunk === 'function') onChunk(p.text);
          }
        }
      }
    }
  }
  return full;
}

async function callGeminiText(env, { model, system, prompt, apiKey, onChunk }) {
  const key = apiKey || env.GEMINI_API_KEY;
  if (!key) throw new Error('no_api_key');
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // ===== STREAMING PATH — real progressive chunks from the model =====
      // Used when the caller supplies onChunk (Global Result UI streaming).
      // Non-streaming callers are byte-identical to the legacy path below.
      if (typeof onChunk === 'function') {
        const res = await fetch(GEMINI_BASE + '/models/' + model + ':streamGenerateContent?alt=sse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(body),
        });
        let reading = false;
        try {
          if (!res.ok) {
            const errText = await res.text();
            let data = null;
            try { data = JSON.parse(errText); } catch (e) {}
            lastErr = new Error((data && data.error && data.error.message) || ('gemini_error_' + res.status));
            if (res.status === 429 || res.status >= 500) continue;
            break;
          }
          reading = true;
          const full = await readGeminiSseStream(res, onChunk);
          const outText = full.trim();
          if (!outText) {
            const err = new Error('gemini_empty_response');
            err.noRetry = true;
            throw err;
          }
          return outText;
        } catch (e) {
          // Mid-stream failure — never retry (would duplicate chunks to the UI)
          if (reading) { lastErr = e; break; }
          throw e;
        }
      }
      // ===== LEGACY PATH — full response at once (unchanged) =====
      const res = await fetch(GEMINI_BASE + '/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch (e) { lastErr = new Error('bad_response (gateway/timeout)'); continue; }
      if (!res.ok) {
        lastErr = new Error((data.error && data.error.message) || ('gemini_error_' + res.status));
        if (res.status === 429 || res.status >= 500) continue;
        break;
      }
      const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      const outText = (parts || []).map(p => p.text || '').join('').trim();
      const finishReason = data.candidates && data.candidates[0] && data.candidates[0].finishReason;
      const blockReason = data.promptFeedback && data.promptFeedback.blockReason;
      if (!outText) {
        const err = new Error('gemini_empty_response' + (finishReason ? ' finishReason=' + finishReason : '') + (blockReason ? ' blockReason=' + blockReason : ''));
        err.noRetry = true;
        try { console.error('[AICS] gemini empty response', JSON.stringify({ model, finishReason, blockReason, modelVersion: data.modelVersion, usage: data.usageMetadata })); } catch (_) {}
        throw err;
      }
      return outText;
    } catch (e) {
      lastErr = e;
      if (e && e.noRetry) break;
      await new Promise(r => setTimeout(r, 800));
    }
  }
  throw lastErr || new Error('gemini_failed');
}

async function callGeminiImage(env, { model, prompt, apiKey }) {
  const key = apiKey || env.GEMINI_API_KEY;
  if (!key) throw new Error('no_api_key');
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(GEMINI_BASE + '/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch (e) { lastErr = new Error('bad_response (gateway/timeout)'); continue; }
      if (!res.ok) {
        lastErr = new Error((data.error && data.error.message) || ('gemini_error_' + res.status));
        if (res.status === 429 || res.status >= 500) continue;
        break;
      }
      const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      const img = parts && parts.find(p => p.inlineData && p.inlineData.data);
      if (!img) throw new Error('no_image');
      return { data: img.inlineData.data, mimeType: img.inlineData.mimeType || 'image/png' };
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 800));
    }
  }
  throw lastErr || new Error('image_failed');
}

// ===== Multimodal (Text + Image(s)) — Short Video / Shop / Image Reference =====
// Shared guard for all image-reference workflows (Shop, Short, Image branches).
// Limits protect Gemini payload construction without changing frontend request contracts.
function validateMultimodalInputs(prompt, images) {
  const MAX_PROMPT_CHARS = 100_000;
  const MAX_IMAGES = 5;
  const MAX_IMAGE_CHARS = 12 * 1024 * 1024;
  const MAX_TOTAL_IMAGE_CHARS = 20 * 1024 * 1024;

  if (typeof prompt !== 'string' || prompt.length > MAX_PROMPT_CHARS) {
    throw new Error('prompt_too_large');
  }
  const list = images == null ? [] : images;
  if (!Array.isArray(list)) throw new Error('invalid_images');
  if (list.length > MAX_IMAGES) throw new Error('too_many_images');

  let totalChars = 0;
  for (const img of list) {
    if (!img || typeof img !== 'object') throw new Error('invalid_image');
    const data = img.base64 || img.data;
    if (typeof data !== 'string' || !data.length || typeof img.mimeType !== 'string' || !img.mimeType.startsWith('image/')) {
      throw new Error('invalid_image');
    }
    if (data.length > MAX_IMAGE_CHARS) throw new Error('image_too_large');
    totalChars += data.length;
    if (totalChars > MAX_TOTAL_IMAGE_CHARS) throw new Error('images_too_large');
  }
  return list;
}

async function callGeminiMultimodal(env, { model, prompt, images, apiKey }) {
  const key = apiKey || env.GEMINI_API_KEY;
  if (!key) throw new Error('no_api_key');
  const validatedImages = validateMultimodalInputs(prompt, images);
  const parts = [{ text: prompt }];
  validatedImages.forEach((img) => {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 || img.data } });
  }););
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(GEMINI_BASE + '/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts }] }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch (e) { lastErr = new Error('bad_response (gateway/timeout)'); continue; }
      if (!res.ok) {
        lastErr = new Error((data.error && data.error.message) || ('gemini_error_' + res.status));
        if (res.status === 429 || res.status >= 500) continue;
        break;
      }
      const outParts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      const outText = (outParts || []).map(p => p.text || '').join('').trim();
      const finishReason = data.candidates && data.candidates[0] && data.candidates[0].finishReason;
      const blockReason = data.promptFeedback && data.promptFeedback.blockReason;
      if (!outText) {
        const err = new Error('gemini_empty_response' + (finishReason ? ' finishReason=' + finishReason : '') + (blockReason ? ' blockReason=' + blockReason : ''));
        err.noRetry = true;
        try { console.error('[AICS] gemini empty response', JSON.stringify({ model, finishReason, blockReason, modelVersion: data.modelVersion, usage: data.usageMetadata })); } catch (_) {}
        throw err;
      }
      return outText;
    } catch (e) {
      lastErr = e;
      if (e && e.noRetry) break;
      await new Promise(r => setTimeout(r, 800));
    }
  }
  throw lastErr || new Error('gemini_failed');
}

// ===== TTS (Text → Audio) — Voice Studio. Gemini က PCM Audio ပြန်ပေးသည် =====
// Phase C — TTS Model ကိုလည်း Admin (ai_models) မှ ထိန်းချုပ်နိုင်သည်
async function callGeminiTTS(env, { text, voiceName, apiKey, model }) {
  const key = apiKey || env.GEMINI_API_KEY;
  if (!key) throw new Error('no_api_key');
  const ttsModel = model || 'gemini-2.5-flash-preview-tts';
  const body = {
  contents: [{ parts: [{ text }] }],
  generationConfig: {
    responseModalities: ['AUDIO'],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } } },
  },
};
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(GEMINI_BASE + '/models/' + ttsModel + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch (e) { lastErr = new Error('bad_response (gateway/timeout)'); continue; }
      if (!res.ok) {
        lastErr = new Error((data.error && data.error.message) || ('gemini_error_' + res.status));
        if (res.status === 429 || res.status >= 500) continue;
        break;
      }
      const outParts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      const audio = outParts && outParts.find(p => p.inlineData && p.inlineData.data);
      if (!audio) throw new Error('no_audio');
      return { data: audio.inlineData.data, mimeType: audio.inlineData.mimeType || 'audio/L16;rate=24000' };
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 800));
    }
  }
  throw lastErr || new Error('tts_failed');
}

export { callGeminiText, callGeminiImage, callGeminiMultimodal, callGeminiTTS, validateMultimodalInputs };
