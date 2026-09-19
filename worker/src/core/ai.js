// AI Creative Studio — AI Router (Gemini) — Phase 3d (text + image)
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

async function callGeminiText(env, { model, system, prompt, apiKey }) {
  const key = apiKey || env.GEMINI_API_KEY;
  if (!key) throw new Error('no_api_key');
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
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
      return parts ? parts.map(p => p.text || '').join('').trim() : '';
    } catch (e) {
      lastErr = e;
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
async function callGeminiMultimodal(env, { model, prompt, images, apiKey }) {
  const key = apiKey || env.GEMINI_API_KEY;
  if (!key) throw new Error('no_api_key');
  const parts = [{ text: prompt }];
  (images || []).forEach((img) => {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 || img.data } });
  });
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
      return outParts ? outParts.map(p => p.text || '').join('').trim() : '';
    } catch (e) {
      lastErr = e;
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

export { callGeminiText, callGeminiImage, callGeminiMultimodal, callGeminiTTS };
