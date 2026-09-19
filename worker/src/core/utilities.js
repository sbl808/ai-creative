// AI Creative Studio — Shared Utilities (Phase 2)
// Studio အားလုံး အသုံးပြုသော Common Helpers — Studio-specific Logic မထည့်ပါ။
// Content / Story / Short / Image / Voice / Shop Studio များက ဤ module ကို ခေါ်သုံးသည်။

// ============================================================
// 1. Content Parser ([CONTENT] / [SPEAKING_STYLE] / [VOICE_STYLE])
// Content Studio + Shop Studio နှစ်ခုလုံး သုံးသည်
// ============================================================
export function parseContentResponse(rawText) {
  const result = { content: '', speakingStyle: '', voiceStyle: '' };
  if (!rawText) return result;

  const contentMatch = rawText.match(/\[CONTENT\]([\s\S]*?)(?=\[SPEAKING_STYLE\]|\[VOICE_STYLE\]|$)/i);
  const speakingMatch = rawText.match(/\[SPEAKING_STYLE\]([\s\S]*?)(?=\[VOICE_STYLE\]|\[CONTENT\]|$)/i);
  const voiceMatch = rawText.match(/\[VOICE_STYLE\]([\s\S]*?)(?=\[CONTENT\]|\[SPEAKING_STYLE\]|$)/i);

  if (contentMatch) result.content = contentMatch[1].trim();
  if (speakingMatch) result.speakingStyle = speakingMatch[1].trim();
  if (voiceMatch) result.voiceStyle = voiceMatch[1].trim();

  if (!contentMatch && !speakingMatch && !voiceMatch) result.content = rawText.trim();
  return result;
}

// ============================================================
// 2. Video Plan Parser ([SCENE_START] / [CHARACTER_START] / [PRODUCT_START])
// Story / Content / Short / Shop Video — Shared Base Parser
// opts.product = true (default) ဆိုလျှင် [PRODUCT_START] Block ပါ Parse လုပ်မည် (Shop)
// ============================================================
export function parseVideoPlan(rawText, opts = {}) {
  const result = { scenes: [], characters: [], product: null, rawFallback: false };
  if (!rawText) return result;

  // ----- Scene Blocks (Video + Environment) -----
  const sceneBlocks = rawText.match(/\[SCENE_START\][\s\S]*?\[SCENE_END\]/gi);
  if (sceneBlocks) {
    sceneBlocks.forEach((block, idx) => {
      const numberMatch = block.match(/SCENE_NUMBER:\s*([\s\S]*?)(?=\n\s*VIDEO_PROMPT:|\[SCENE_END\])/i);
      const videoMatch = block.match(/VIDEO_PROMPT:\s*([\s\S]*?)(?=\n\s*ENVIRONMENT_PROMPT:|\[SCENE_END\])/i);
      const envMatch = block.match(/ENVIRONMENT_PROMPT:\s*([\s\S]*?)\[SCENE_END\]/i);
      result.scenes.push({
        number: numberMatch ? numberMatch[1].trim() : String(idx + 1),
        videoPrompt: videoMatch ? videoMatch[1].trim() : '',
        environmentPrompt: envMatch ? envMatch[1].trim() : '',
      });
    });
  }

  // ----- Product Block (Shop Studio အတွက်သာ) -----
  if (opts.product !== false) {
    const productBlock = rawText.match(/\[PRODUCT_START\][\s\S]*?\[PRODUCT_END\]/i);
    if (productBlock) {
      const pNameMatch = productBlock[0].match(/PRODUCT_NAME:\s*([\s\S]*?)(?=\n\s*PRODUCT_PROMPT:|\[PRODUCT_END\])/i);
      const pPromptMatch = productBlock[0].match(/PRODUCT_PROMPT:\s*([\s\S]*?)\[PRODUCT_END\]/i);
      result.product = {
        name: pNameMatch ? pNameMatch[1].trim() : '(ကုန်ပစ္စည်း)',
        prompt: pPromptMatch ? pPromptMatch[1].trim() : '',
      };
    }
  }

  // ----- Character Blocks -----
  const charBlocks = rawText.match(/\[CHARACTER_START\][\s\S]*?\[CHARACTER_END\]/gi);
  if (charBlocks) {
    charBlocks.forEach((block) => {
      const nameMatch = block.match(/CHARACTER_NAME:\s*([\s\S]*?)(?=\n\s*CHARACTER_ROLE:|\[CHARACTER_END\])/i);
      const roleMatch = block.match(/CHARACTER_ROLE:\s*([\s\S]*?)(?=\n\s*CHARACTER_PROMPT:|\[CHARACTER_END\])/i);
      const promptMatch = block.match(/CHARACTER_PROMPT:\s*([\s\S]*?)\[CHARACTER_END\]/i);
      result.characters.push({
        name: nameMatch ? nameMatch[1].trim() : '(အမည်မသိ)',
        role: roleMatch ? roleMatch[1].trim() : '',
        prompt: promptMatch ? promptMatch[1].trim() : '',
      });
    });
  }

  // ----- Fallback (Tag ဘာမှ မတွေ့ရင် Raw Text ကို Scene ၁ အဖြစ် ထားသည်) -----
  const needsFallback = opts.product === false
    ? result.scenes.length === 0 && result.characters.length === 0
    : result.scenes.length === 0 && !result.product;

  if (needsFallback) {
    result.scenes.push({ number: '1', videoPrompt: rawText.trim(), environmentPrompt: '' });
    result.rawFallback = true;
  }

  return result;
}

// ============================================================
// 3. Reference Image Instruction (Multimodal — Text + Image(s))
// Short / Shop / Image Studio အားလုံးအတွက် Shared Instruction Text
// kind: 'product' | 'character' | 'general' (default)
// ============================================================
export function referenceImageInstruction(images, kind) {
  const count = Array.isArray(images) ? images.length : 0;
  if (count === 0) return '';

  if (kind === 'product') {
    return '\n\n(User သည် Product Reference ပုံ ' + count + ' ပုံ ပူးတွဲပေးထားပါသည် — ' +
      'ဒီပုံများထဲက ကုန်ပစ္စည်း/Product ရဲ့ တကယ့် အရောင်/ပုံသဏ္ဌာန်/Design ကို လေ့လာပြီး ' +
      'ကြော်ငြာပုံ Prompt ရေးတဲ့အခါ ပုံနှင့် ကိုက်ညီအောင် တိကျစွာ ထည့်သွင်းရေးပါ. ' +
      'PRODUCT/AD DESCRIPTION Text ထက် ပုံအစစ်ကို ဦးစားပေး ကိုးကားပါ.)';
  }

  if (kind === 'character') {
    return '\n\n(User သည် Reference ပုံ ' + count + ' ပုံ ပူးတွဲပေးထားပါသည် — ' +
      'ဒီပုံများထဲက Character (ရှိလျှင်) ရဲ့ အဓိကအင်္ဂါရပ်များ (မျက်နှာ/ပုံပန်းသဏ္ဌာန်/' +
      'ဝတ်စုံ/ပတ်ဝန်းကျင်/အရောင်) ကို လေ့လာပြီး Character Reference Prompt ထဲမှာ ' +
      'ပုံအစစ်နှင့် ကိုက်ညီအောင် အသေးစိတ် ထည့်သွင်းရေးပါ. Environment/Video Prompt ' +
      'များကိုလည်း ဒီ Character ပုံစံနှင့် ကိုက်ညီအောင် ချိတ်ဆက်ရေးပါ.)';
  }

  return '\n\n(User သည် Reference ပုံ ' + count + ' ပုံ ပူးတွဲပေးထားပါသည် — ' +
    'ဒီပုံများထဲက အဓိကအင်္ဂါရပ်များ (မျက်နှာ/ပုံပန်းသဏ္ဌာန်/ဝတ်စုံ/ပတ်ဝန်းကျင်/အရောင်) ' +
    'ကို လေ့လာပြီး အထက်ပါ CORE/WORKFLOW instruction အတိုင်း Prompt ထဲ ' +
    'ထည့်သွင်းရေးပါ. ပုံများအားလုံးကို ချိတ်ဆက်ပြီး တစ်ညီတည်း Consistent ' +
    'ဖြစ်အောင် ဆင်ခြင်ပါ.)';
}

// ============================================================
// 4. WAV Header Builder (Voice TTS — Gemini က PCM ပြန်ပေးသောကြောင့် WAV ပြောင်းရန်)
// ============================================================
function numberToBytesLE(num, byteCount) {
  const bytes = [];
  for (let i = 0; i < byteCount; i++) {
    let b = num & 0xff;
    if (b > 127) b -= 256;
    bytes.push(b);
    num = num >>> 8;
  }
  return bytes;
}

function stringToBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
  return bytes;
}

function buildWavHeader(dataLength, sampleRate, numChannels, bitsPerSample) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  let header = [];
  header = header.concat(stringToBytes('RIFF'));
  header = header.concat(numberToBytesLE(36 + dataLength, 4));
  header = header.concat(stringToBytes('WAVE'));
  header = header.concat(stringToBytes('fmt '));
  header = header.concat(numberToBytesLE(16, 4));
  header = header.concat(numberToBytesLE(1, 2));
  header = header.concat(numberToBytesLE(numChannels, 2));
  header = header.concat(numberToBytesLE(sampleRate, 4));
  header = header.concat(numberToBytesLE(byteRate, 4));
  header = header.concat(numberToBytesLE(blockAlign, 2));
  header = header.concat(numberToBytesLE(bitsPerSample, 2));
  header = header.concat(stringToBytes('data'));
  header = header.concat(numberToBytesLE(dataLength, 4));
  return header;
}

// PCM Base64 → WAV Base64 (Sample Rate 24000 / Mono / 16-bit — Gemini TTS Default)
export function pcmToWavBase64(pcmBase64, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const bin = atob(pcmBase64);
  const pcmBytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) pcmBytes[i] = bin.charCodeAt(i);

  const header = buildWavHeader(pcmBytes.length, sampleRate, numChannels, bitsPerSample);
  const wav = new Uint8Array(header.length + pcmBytes.length);
  wav.set(header, 0);
  wav.set(pcmBytes, header.length);

  let binary = '';
  for (let i = 0; i < wav.length; i++) binary += String.fromCharCode(wav[i]);
  return btoa(binary);
}

// ============================================================
// 5. User API Key (BYOK — D1 + AES-GCM Encryption)
// Source ရဲ့ Google User Properties နှင့် တူညီသော ရည်ရွယ်ချက်
// Key ကို plaintext မသိမ်းဘဲ AES-GCM ဖြင့် စာဝှက် (encrypt) ပြီးမှ သိမ်းသည်။
// သုံးသည့်အခါ Worker အတွင်း၌သာ Decrypt လုပ်သည် — Client ဆီ Key ပြန်မပို့ပါ။
// ============================================================

const enc = new TextEncoder();
const dec = new TextDecoder();

// Secret → 32-byte AES-GCM Key (SHA-256 Digest)
// ⚠️ Production တွင် KEY_ENCRYPTION_SECRET ကို မဖြစ်မနေ ထည့်ရန် (wrangler secret put)
async function getCryptoKey(env) {
  const secret = env.KEY_ENCRYPTION_SECRET || env.SESSION_SIGNING_KEY || 'dev-key-encryption-secret';
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

// Plaintext → Base64 (IV 12 bytes + Ciphertext + Auth Tag)
async function encryptSecret(env, plaintext) {
  const key = await getCryptoKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const buf = new Uint8Array(iv.length + ct.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(ct), iv.length);
  let binary = '';
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

// Base64 → Plaintext (Decrypt — Worker အတွင်းမှသာ)
async function decryptSecret(env, blob) {
  const key = await getCryptoKey(env);
  const bin = atob(blob);
  const raw = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) raw[i] = bin.charCodeAt(i);
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return dec.decode(pt);
}

export async function getUserApiKey(env, userId) {
  if (!env.DB || !userId) return null;
  try {
    const row = await env.DB.prepare('SELECT gemini_key FROM user_keys WHERE user_id = ?').bind(userId).first();
    if (!row || !row.gemini_key) return null;
    return await decryptSecret(env, row.gemini_key);
  } catch (e) {
    return null;
  }
}

export async function saveUserApiKey(env, userId, key) {
  if (!env.DB) throw new Error('no_db');
  const encrypted = await encryptSecret(env, String(key).trim());
  await env.DB.prepare(
    "INSERT INTO user_keys (user_id, gemini_key, updated_at) VALUES (?, ?, datetime('now')) " +
    "ON CONFLICT(user_id) DO UPDATE SET gemini_key = excluded.gemini_key, updated_at = datetime('now')"
  ).bind(userId, encrypted).run();
  return { ok: true };
}
