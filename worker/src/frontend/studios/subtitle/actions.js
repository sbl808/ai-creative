// AI Creative Studio — Subtitle Studio browser actions.
// Media and generated SRT remain in browser memory; no persistence or logging.
export const ACTIONS_SCRIPT = String.raw`
function subtitleSetStatus(message, isError) {
  var status = document.getElementById('subtitleStatus');
  if (!status) return;
  status.textContent = message;
  status.setAttribute('data-state', isError ? 'error' : 'normal');
}

function subtitleGetToken() {
  try { return localStorage.getItem('aics_token') || ''; } catch (error) { return ''; }
}

function subtitleApiPost(path, body) {
  var token = subtitleGetToken();
  if (!token) return Promise.reject(new Error('unauthorized'));
  if (!window.AICS_BYOK || typeof window.AICS_BYOK.withGeminiKey !== 'function') {
    return Promise.reject(new Error('credentials_unavailable'));
  }

  // API Key ကို Browser IndexedDB မှ ဖွင့်ယူပြီး လက်ရှိ Request အတွက်သာ ထည့်ပို့သည်။
  // Key ကို localStorage သို့မဟုတ် Studio state ထဲ မသိမ်းပါ။
  return window.AICS_BYOK.withGeminiKey(body).then(function (requestBody) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      cache: 'no-store',
      body: JSON.stringify(requestBody)
    });
  }).then(function (response) {
    return response.json().catch(function () { return {}; }).then(function (data) {
      if (!response.ok) throw new Error(data.error || 'request_failed');
      return data;
    });
  });
}

function subtitleFriendlyRequestError(code, fallback) {
  var messages = {
    credentials_unavailable: 'Browser Storage မရနိုင်ပါ။ စာမျက်နှာကို ပြန်ဖွင့်ပြီး ထပ်ကြိုးစားပါ။',
    credentials_login_required: 'Login ဝင်ပြီးမှ API Key ကို အသုံးပြုနိုင်ပါသည်။',
    credentials_account_unavailable: 'Account အချက်အလက် မရရှိပါ။ ပြန်လည် Login ဝင်ပါ။',
    credentials_not_found: 'Gemini API Key မထည့်ရသေးပါ။ Settings မှာ API Key ထည့်ပါ။',
    credentials_passphrase_cancelled: 'API Key ဖွင့်ရန် Passphrase မထည့်ရသေးပါ။',
    credentials_passphrase_required: 'API Key ဖွင့်ရန် Passphrase ထည့်ပေးပါ။',
    credentials_decrypt_failed: 'Passphrase မမှန်ပါ သို့မဟုတ် API Key ကို ဖွင့်မရပါ။',
    empty_result: 'AI မှ စာသားရလဒ် မရရှိပါ။ ထပ်မံကြိုးစားပါ။',
    transcribe_error: 'Audio မှ စာသားထုတ်ယူရာတွင် အခက်အခဲရှိနေပါသည်။',
    missing_api_key: 'Gemini API Key မရရှိပါ။ Settings မှာ API Key ကို စစ်ဆေးပါ။',
    unauthorized: 'Login ဝင်ထားခြင်း မရှိပါ။ ပြန်လည် Login ဝင်ပါ။',
    invalid_token: 'Login သက်တမ်းကုန်ဆုံးသွားပါသည်။ ပြန်လည် Login ဝင်ပါ။',
    feature_denied: 'ဒီ Feature ကို သင့် Plan နဲ့ အသုံးပြုခွင့်မရှိသေးပါ။',
    feature_disabled: 'ဒီ Feature ကို လောလောဆယ် ပိတ်ထားပါသည်။'
  };
  return messages[String(code || '')] || fallback;
}

function subtitleGetTranscriptionMedia() {
  var input = document.getElementById('subtitleMediaFile');
  var file = input && input.files && input.files[0];
  if (file) return { file: file, mimeType: file.type || 'application/octet-stream' };
  var handoff = SUBTITLE_STATE.mediaInput;
  if (handoff && handoff.audioBase64) {
    return { audioBase64: String(handoff.audioBase64), mimeType: handoff.mimeType || 'audio/mpeg' };
  }
  return null;
}

function subtitleUpdateTranscribeAvailability() {
  var button = document.getElementById('subtitleTranscribeBtn');
  var status = document.getElementById('subtitleTranscribeStatus');
  if (!button) return;
  var media = subtitleGetTranscriptionMedia();
  var size = media && media.file ? media.file.size : 0;
  var tooLarge = size > 5 * 1024 * 1024;
  button.disabled = !media || tooLarge || SUBTITLE_STATE.processingState === 'processing';
  if (status && tooLarge) status.textContent = 'ဖိုင်သည် 5MB ထက် မကျော်ရပါ။';
  else if (status && media && button.disabled === false) status.textContent = 'Audio ဖိုင် အသင့်ဖြစ်ပါပြီ။ စာသားထုတ်ရန် နှိပ်ပါ။';
  else if (status && !media) status.textContent = 'Audio ဖိုင် ရွေးပါ သို့မဟုတ် Shop မှ Audio ပို့ပါ။';
}

function subtitleRequestTranscription(audioBase64, mimeType, button) {
  subtitleApiPost('/api/studio/subtitle/transcribe', {
    audioBase64: audioBase64,
    mimeType: mimeType || 'application/octet-stream',
    type: '1'
  }).then(function (result) {
    var output = document.getElementById('subtitleTranscriptOutput');
    var transcript = String(result.text || '');
    if (!transcript.trim()) throw new Error('empty_result');
    if (output) {
      output.value = transcript;
      output.focus();
    }
    SUBTITLE_STATE.processingState = 'done';
    subtitleSetStatus('Audio မှ စာသား ထုတ်ယူပြီးပါပြီ။ လိုအပ်သလို ပြင်ဆင်နိုင်ပါသည်။', false);
    var status = document.getElementById('subtitleTranscribeStatus');
    if (status) status.textContent = 'စာသားထုတ်ယူပြီးပါပြီ။ ရလဒ်ကို အောက်ပါနေရာတွင် ပြင်ဆင်နိုင်ပါသည်။';
  }).catch(function (error) {
    SUBTITLE_STATE.processingState = 'error';
    SUBTITLE_STATE.errorState = String(error && error.message || 'transcribe_error');
    var code = SUBTITLE_STATE.errorState;
    var message = subtitleFriendlyRequestError(code, 'Audio မှ စာသားထုတ်ယူရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။');
    subtitleSetStatus(message, true);
    var status = document.getElementById('subtitleTranscribeStatus');
    if (status) status.textContent = message;
  }).finally(function () {
    if (button) button.disabled = false;
    subtitleUpdateTranscribeAvailability();
  });
}

function subtitleTranscribeAudio() {
  if (SUBTITLE_STATE.processingState === 'processing') return;
  var media = subtitleGetTranscriptionMedia();
  if (!media) {
    subtitleSetStatus('Audio ဖိုင် ရွေးပေးပါ သို့မဟုတ် Shop မှ Audio ပို့ပါ။', true);
    return;
  }
  if (media.file && media.file.size > 5 * 1024 * 1024) {
    subtitleSetStatus('ဖိုင်သည် 5MB ထက် မကျော်ရပါ။', true);
    subtitleUpdateTranscribeAvailability();
    return;
  }
  var button = document.getElementById('subtitleTranscribeBtn');
  SUBTITLE_STATE.processingState = 'processing';
  SUBTITLE_STATE.errorState = null;
  if (button) button.disabled = true;
  var status = document.getElementById('subtitleTranscribeStatus');
  if (status) status.textContent = 'Audio မှ စာသား ထုတ်ယူနေပါသည်…';
  subtitleSetStatus('Audio မှ စာသား ထုတ်ယူနေပါသည်…', false);

  if (media.audioBase64) {
    var importedBytes = Math.max(0, Math.floor(media.audioBase64.length * 3 / 4) -
      (media.audioBase64.slice(-2) === '==' ? 2 : (media.audioBase64.slice(-1) === '=' ? 1 : 0)));
    if (!media.audioBase64 || importedBytes > 5 * 1024 * 1024) {
      SUBTITLE_STATE.processingState = 'error';
      subtitleSetStatus('Shop မှ ပို့ထားသော Audio သည် 5MB ထက် ကျော်နေပါသည် သို့မဟုတ် ဖိုင်မမှန်ပါ။', true);
      subtitleUpdateTranscribeAvailability();
      return;
    }
    subtitleRequestTranscription(media.audioBase64, media.mimeType, button);
    return;
  }

  var reader = new FileReader();
  reader.onerror = function () {
    SUBTITLE_STATE.processingState = 'error';
    subtitleSetStatus('ဖိုင်ဖတ်ရာတွင် အခက်အခဲရှိနေပါသည်။', true);
    subtitleUpdateTranscribeAvailability();
  };
  reader.onload = function () {
    var dataUrl = String(reader.result || '');
    var audioBase64 = dataUrl.indexOf(',') >= 0 ? dataUrl.slice(dataUrl.indexOf(',') + 1) : '';
    if (!audioBase64) {
      SUBTITLE_STATE.processingState = 'error';
      subtitleSetStatus('ဖိုင်အချက်အလက်ကို ဖတ်မရပါ။', true);
      subtitleUpdateTranscribeAvailability();
      return;
    }
    subtitleRequestTranscription(audioBase64, media.mimeType, button);
  };
  reader.readAsDataURL(media.file);
}

function subtitleRequestSrt(audioBase64, mimeType, known, button) {
  subtitleApiPost('/api/studio/subtitle/srt', {
    audioBase64: audioBase64,
    mimeType: mimeType || 'application/octet-stream',
    knownText: known ? known.value : '',
    type: '2'
  }).then(function (result) {
    var editor = document.getElementById('subtitleSrtInput');
    var srt = String(result.srt || '');
    if (!srt) throw new Error('empty_result');
    SUBTITLE_STATE.sourceSrt = srt;
    SUBTITLE_STATE.editedSrt = srt;
    if (editor) { editor.value = srt; editor.focus(); }
    SUBTITLE_STATE.processingState = 'done';
    subtitleSetStatus('SRT ဖန်တီးပြီးပါပြီ။ လိုအပ်သလို ပြင်ဆင်ပြီး .srt ဖိုင်အဖြစ် သိမ်းနိုင်ပါသည်။', false);
  }).catch(function (error) {
    SUBTITLE_STATE.processingState = 'error';
    SUBTITLE_STATE.errorState = String(error && error.message || 'request_failed');
    var code = SUBTITLE_STATE.errorState;
    var message = subtitleFriendlyRequestError(code, 'SRT ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။');
    subtitleSetStatus(message, true);
  }).finally(function () { if (button) button.disabled = false; });
}

function subtitleGenerateSrt() {
  if (SUBTITLE_STATE.processingState === 'processing') return;
  var input = document.getElementById('subtitleMediaFile');
  var file = input && input.files && input.files[0];
  var handoffMedia = SUBTITLE_STATE.mediaInput;
  if (!file && (!handoffMedia || !handoffMedia.audioBase64)) {
    subtitleSetStatus('Audio သို့မဟုတ် Video ဖိုင် ရွေးပေးပါ၊ သို့မဟုတ် Shop မှ Audio ပို့ပါ။', true);
    return;
  }
  if (file && file.size > 5 * 1024 * 1024) {
    subtitleSetStatus('ဖိုင်သည် 5MB ထက် မကျော်ရပါ။', true);
    return;
  }
  var button = document.getElementById('subtitleGenerateBtn');
  var known = document.getElementById('subtitleKnownText');
  SUBTITLE_STATE.processingState = 'processing';
  SUBTITLE_STATE.errorState = null;
  if (button) button.disabled = true;
  subtitleSetStatus('SRT ဖန်တီးနေပါသည်…', false);

  if (!file) {
    var importedBase64 = String(handoffMedia.audioBase64 || '');
    var importedBytes = Math.max(0, Math.floor(importedBase64.length * 3 / 4) -
      (importedBase64.slice(-2) === '==' ? 2 : (importedBase64.slice(-1) === '=' ? 1 : 0)));
    if (!importedBase64 || importedBytes > 5 * 1024 * 1024) {
      SUBTITLE_STATE.processingState = 'error';
      if (button) button.disabled = false;
      subtitleSetStatus('Shop မှ ပို့ထားသော Audio သည် 5MB ထက် ကျော်နေပါသည် သို့မဟုတ် ဖိုင်မမှန်ပါ။', true);
      return;
    }
    subtitleRequestSrt(importedBase64, handoffMedia.mimeType, known, button);
    return;
  }

  var reader = new FileReader();
  reader.onerror = function () {
    SUBTITLE_STATE.processingState = 'error';
    if (button) button.disabled = false;
    subtitleSetStatus('ဖိုင်ဖတ်ရာတွင် အခက်အခဲရှိနေပါသည်။', true);
  };
  reader.onload = function () {
    var dataUrl = String(reader.result || '');
    var audioBase64 = dataUrl.indexOf(',') >= 0 ? dataUrl.slice(dataUrl.indexOf(',') + 1) : '';
    if (!audioBase64) {
      SUBTITLE_STATE.processingState = 'error';
      if (button) button.disabled = false;
      subtitleSetStatus('ဖိုင်အချက်အလက်ကို ဖတ်မရပါ။', true);
      return;
    }
    subtitleRequestSrt(audioBase64, file.type || 'application/octet-stream', known, button);
  };
  reader.readAsDataURL(file);
}

function subtitleFingerprint(base64Data) {
  if (!window.crypto || !window.crypto.subtle || typeof window.TextEncoder !== 'function') {
    return Promise.reject(new Error('handoff_fingerprint_unavailable'));
  }
  var bytes = new window.TextEncoder().encode(String(base64Data || ''));
  return window.crypto.subtle.digest('SHA-256', bytes).then(function (buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (value) {
      return value.toString(16).padStart(2, '0');
    }).join('');
  });
}

function subtitleLoadShopAudioHandoff() {
  var params;
  try { params = new URLSearchParams(window.location.search || ''); }
  catch (error) { return; }
  var handoffId = params.get('handoff');
  if (!handoffId) return;

  var handoffStatus = document.getElementById('subtitleHandoffStatus');
  function setHandoffStatus(message, isError) {
    if (!handoffStatus) return;
    handoffStatus.textContent = message;
    handoffStatus.setAttribute('data-state', isError ? 'error' : 'success');
  }

  if (!window.AICS_HANDOFFS || !window.AICS_STUDIO_DRAFTS ||
      typeof window.AICS_HANDOFFS.get !== 'function' ||
      typeof window.AICS_STUDIO_DRAFTS.load !== 'function') {
    setHandoffStatus('IndexedDB Handoff ကို ဖွင့်မရပါ။ Shop Draft ကို မပြောင်းလဲထားပါ။', true);
    return;
  }

  setHandoffStatus('Shop မှ ပို့ထားသော Audio ကို စစ်ဆေးနေပါသည်…', false);
  window.AICS_HANDOFFS.get(handoffId).then(function (record) {
    if (!record || record.contractVersion !== 1 || record.source !== 'shop' ||
        record.target !== 'subtitle' || !record.payload ||
        record.payload.kind !== 'shop-audio-reference' ||
        typeof record.payload.audioFingerprint !== 'string') {
      throw new Error('invalid_handoff');
    }
    return window.AICS_STUDIO_DRAFTS.load('shop').then(function (draft) {
      var audio = draft && draft.data && draft.data.data && draft.data.data.shopState &&
        draft.data.data.shopState.audio && draft.data.data.shopState.audio.result;
      if (!audio || typeof audio.data !== 'string' || !audio.data) {
        throw new Error('shop_audio_missing');
      }
      if (String(audio.mimeType || 'audio/wav') !== String(record.payload.mimeType || 'audio/wav')) {
        throw new Error('shop_audio_mismatch');
      }
      return subtitleFingerprint(audio.data).then(function (fingerprint) {
        if (fingerprint !== record.payload.audioFingerprint) throw new Error('shop_audio_mismatch');
        SUBTITLE_STATE.mediaInput = {
          audioBase64: audio.data,
          mimeType: String(audio.mimeType || 'audio/wav'),
          voiceName: String(audio.voiceName || record.payload.voiceName || 'Voice'),
          source: 'shop'
        };
        subtitleUpdateTranscribeAvailability();
        setHandoffStatus('✓ Shop မှ Audio ကို ချိတ်ဆက်ပြီးပါပြီ။ Audio → Text သို့မဟုတ် SRT ကို ဆက်လုပ်နိုင်ပါသည်။', false);
      });
    });
  }).catch(function (error) {
    var code = String(error && error.message || '');
    var message = code === 'shop_audio_missing'
      ? 'Shop Draft ထဲတွင် Audio မတွေ့ပါ။ Shop Studio သို့ ပြန်သွားပြီး ထပ်ပို့ပါ။'
      : code === 'shop_audio_mismatch'
        ? 'Shop Audio ပြောင်းလဲသွားပါသည်။ လက်ရှိ Audio ကို မသုံးပါ။ Shop မှ ပြန်ပို့ပါ။'
        : 'Shop Audio Handoff ကို အတည်မပြုနိုင်ပါ။ Audio ကို အသုံးမပြုပါ။';
    SUBTITLE_STATE.mediaInput = null;
    setHandoffStatus(message, true);
  });
}

function subtitleDownloadText(text, filename, emptyMessage) {
  if (!String(text || '').trim()) { subtitleSetStatus(emptyMessage, true); return; }
  var url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  var anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  subtitleSetStatus('SRT ဖိုင်ကို Browser မှာ သိမ်းဆည်းရန် ပြင်ဆင်ပြီးပါပြီ။', false);
}

function subtitleDownloadSrt() {
  var editor = document.getElementById('subtitleSrtInput');
  subtitleDownloadText(editor ? editor.value : '', 'subtitle.srt', 'သိမ်းရန် SRT စာသား မရှိပါ။');
}

function subtitleValidateEditorSrt() {
  var editor = document.getElementById('subtitleSrtInput');
  var status = document.getElementById('subtitleValidationStatus');
  if (!editor || !status) return;

  var validation = subtitleValidateSrt(editor.value);
  if (validation.valid) {
    status.textContent = 'စစ်ဆေးမှု အောင်မြင်ပါသည်။ Subtitle အပိုင်း ' + validation.cues.length + ' ခု မှန်ကန်ပါသည်။';
    status.setAttribute('data-state', 'success');
    return;
  }

  var details = validation.errors.slice(0, 5).join(' ');
  if (validation.errors.length > 5) details += ' အခြားအမှား ' + (validation.errors.length - 5) + ' ခု ရှိပါသေးသည်။';
  status.textContent = 'SRT တွင် ပြင်ဆင်ရန်လိုအပ်သော အချက်များရှိပါသည်။ ' + details;
  status.setAttribute('data-state', 'error');
}

function subtitleSendEditedSrtToTranslation() {
  var editor = document.getElementById('subtitleSrtInput');
  var translationInput = document.getElementById('subtitleTranslationInput');
  if (!editor || !translationInput) return;

  var editedSrt = editor.value;
  if (!editedSrt.trim()) {
    subtitleSetStatus('ဘာသာပြန်ရန် Editor ထဲတွင် SRT စာသား ထည့်ပေးပါ။', true);
    return;
  }

  translationInput.value = editedSrt;
  translationInput.focus();
  subtitleSetStatus('ပြင်ထားသော SRT ကို ဘာသာပြန်ရန်နေရာသို့ ပို့ပြီးပါပြီ။ ဦးတည်ချက်ကို စစ်ဆေးပြီး ဘာသာပြန်နိုင်ပါသည်။', false);
}

function subtitleTranslateSrt() {
  if (SUBTITLE_STATE.processingState === 'processing') return;
  var input = document.getElementById('subtitleTranslationInput');
  var directionInput = document.getElementById('subtitleTranslationDirection');
  var button = document.getElementById('subtitleTranslateBtn');
  var srtText = input ? input.value : '';
  var direction = directionInput ? directionInput.value : 'MY_TO_CN';
  if (!srtText.trim()) { subtitleSetStatus('ဘာသာပြန်ရန် SRT စာသား ထည့်ပေးပါ။', true); return; }
  if (direction !== 'MY_TO_CN' && direction !== 'CN_TO_MY') {
    subtitleSetStatus('ဘာသာပြန်ဦးတည်ချက် မမှန်ကန်ပါ။', true);
    return;
  }

  SUBTITLE_STATE.processingState = 'processing';
  SUBTITLE_STATE.errorState = null;
  SUBTITLE_STATE.translationDirection = direction;
  if (button) button.disabled = true;
  subtitleSetStatus('SRT ကို ဘာသာပြန်နေပါသည်…', false);

  subtitleApiPost('/api/studio/subtitle/translate-srt', {
    srtText: srtText,
    direction: direction,
    type: '2'
  }).then(function (result) {
    var translated = String(result.srt || '');
    if (!translated.trim()) throw new Error('empty_result');
    SUBTITLE_STATE.translatedSrt = translated;
    var output = document.getElementById('subtitleTranslatedOutput');
    if (output) output.value = translated;
    SUBTITLE_STATE.processingState = 'done';
    subtitleSetStatus('SRT ဘာသာပြန်ပြီးပါပြီ။ ရလဒ်ကို စစ်ဆေးပြီး .srt ဖိုင်အဖြစ် သိမ်းနိုင်ပါသည်။', false);
  }).catch(function (error) {
    SUBTITLE_STATE.processingState = 'error';
    SUBTITLE_STATE.errorState = String(error && error.message || 'translate_error');
    var code = SUBTITLE_STATE.errorState;
    var message = code === 'missing_srt' ? 'ဘာသာပြန်ရန် SRT စာသား ထည့်ပေးပါ။' :
      subtitleFriendlyRequestError(code, 'SRT ဘာသာပြန်ရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။');
    subtitleSetStatus(message, true);
  }).finally(function () { if (button) button.disabled = false; });
}

function subtitleDownloadTranslatedSrt() {
  var output = document.getElementById('subtitleTranslatedOutput');
  subtitleDownloadText(output ? output.value : '', 'subtitle-translated.srt', 'သိမ်းရန် ဘာသာပြန်ရလဒ် မရှိပါ။');
}

function subtitleSendTranslatedSrtToEditor() {
  var output = document.getElementById('subtitleTranslatedOutput');
  var editor = document.getElementById('subtitleSrtInput');
  if (!output || !editor) return;

  var translatedSrt = output.value;
  if (!translatedSrt.trim()) {
    subtitleSetStatus('Editor သို့ ပြန်ပို့ရန် ဘာသာပြန်ရလဒ် မရှိပါ။', true);
    return;
  }

  editor.value = translatedSrt;
  SUBTITLE_STATE.editedSrt = translatedSrt;
  editor.focus();
  subtitleSetStatus('ဘာသာပြန်ရလဒ်ကို SRT Editor သို့ ပြန်ပို့ပြီးပါပြီ။ လိုအပ်သလို ပြင်ဆင်ပြီး စစ်ဆေးနိုင်ပါသည်။', false);
}

(function initSubtitleActions() {
  var generate = document.getElementById('subtitleGenerateBtn');
  var transcribe = document.getElementById('subtitleTranscribeBtn');
  var mediaInput = document.getElementById('subtitleMediaFile');
  var download = document.getElementById('subtitleDownloadBtn');
  var editor = document.getElementById('subtitleSrtInput');
  var translate = document.getElementById('subtitleTranslateBtn');
  var downloadTranslated = document.getElementById('subtitleDownloadTranslatedBtn');
  var validate = document.getElementById('subtitleValidateBtn');
  var sendToTranslation = document.getElementById('subtitleSendToTranslationBtn');
  var sendTranslatedToEditor = document.getElementById('subtitleSendTranslatedToEditorBtn');
  if (generate) generate.addEventListener('click', subtitleGenerateSrt);
  if (transcribe) transcribe.addEventListener('click', subtitleTranscribeAudio);
  if (mediaInput) mediaInput.addEventListener('change', subtitleUpdateTranscribeAvailability);
  if (download) download.addEventListener('click', subtitleDownloadSrt);
  if (editor) editor.addEventListener('input', function () { SUBTITLE_STATE.editedSrt = editor.value; });
  if (translate) translate.addEventListener('click', subtitleTranslateSrt);
  if (downloadTranslated) downloadTranslated.addEventListener('click', subtitleDownloadTranslatedSrt);
  if (validate) validate.addEventListener('click', subtitleValidateEditorSrt);
  if (sendToTranslation) sendToTranslation.addEventListener('click', subtitleSendEditedSrtToTranslation);
  if (sendTranslatedToEditor) sendTranslatedToEditor.addEventListener('click', subtitleSendTranslatedSrtToEditor);
  subtitleUpdateTranscribeAvailability();
  subtitleLoadShopAudioHandoff();
})();
`;
