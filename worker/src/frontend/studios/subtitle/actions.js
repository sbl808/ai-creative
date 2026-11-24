// AI Creative Studio — Subtitle Studio browser actions.
// Media and generated SRT remain in browser memory; no persistence or logging.
export const ACTIONS_SCRIPT = String.raw`
function subtitleSetStatus(message, isError) {
  var status = document.getElementById('subtitleStatus');
  if (!status) return;
  status.textContent = message;
  status.setAttribute('data-state', isError ? 'error' : 'normal');
}

function subtitlePersistDraft() {
  if (typeof window.studioPersistDraft === 'function') {
    window.studioPersistDraft(false);
  }
}

function subtitleDraftValue(id) {
  var element = document.getElementById(id);
  return element ? String(element.value || '') : '';
}

function subtitleSelectedModel() {
  var selector = document.getElementById('aiModelSel');
  return selector ? String(selector.value || '') : '';
}

window.studioCollectDraft = function () {
  // File objects and media bytes are deliberately excluded from persisted drafts.
  return {
    data: {
      schemaVersion: 1,
      mode: String(SUBTITLE_STATE.mode || 'media-to-srt'),
      knownText: subtitleDraftValue('subtitleKnownText'),
      outputMode: subtitleDraftValue('subtitleAudioOutput') || 'srt',
      transcriptText: subtitleDraftValue('subtitleTranscriptOutput'),
      sourceSrt: String(SUBTITLE_STATE.sourceSrt || ''),
      editedSrt: subtitleDraftValue('subtitleSrtInput'),
      translationInput: subtitleDraftValue('subtitleTranslationInput'),
      translationDirection: subtitleDraftValue('subtitleTranslationDirection') || 'MY_TO_CN',
      translatedSrt: subtitleDraftValue('subtitleTranslatedOutput')
    }
  };
};

window.studioRestoreDraft = function (draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return;
  var data = draft.data && typeof draft.data === 'object' && !Array.isArray(draft.data) ? draft.data : draft;
  function setValue(id, value) {
    var element = document.getElementById(id);
    if (element && typeof value === 'string') element.value = value;
  }
  setValue('subtitleKnownText', data.knownText);
  setValue('subtitleAudioOutput', data.outputMode === 'text' ? 'text' : 'srt');
  setValue('subtitleTranscriptOutput', data.transcriptText);
  setValue('subtitleSrtInput', data.editedSrt);
  setValue('subtitleTranslationInput', data.translationInput);
  setValue('subtitleTranslationDirection', data.translationDirection === 'CN_TO_MY' ? 'CN_TO_MY' : 'MY_TO_CN');
  setValue('subtitleTranslatedOutput', data.translatedSrt);

  SUBTITLE_STATE.mode = typeof data.mode === 'string' ? data.mode : 'media-to-srt';
  SUBTITLE_STATE.sourceSrt = typeof data.sourceSrt === 'string' ? data.sourceSrt : '';
  SUBTITLE_STATE.editedSrt = typeof data.editedSrt === 'string' ? data.editedSrt : '';
  SUBTITLE_STATE.transcribedText = typeof data.transcriptText === 'string' ? data.transcriptText : '';
  SUBTITLE_STATE.translatedSrt = typeof data.translatedSrt === 'string' ? data.translatedSrt : '';
  SUBTITLE_STATE.translationDirection = data.translationDirection === 'CN_TO_MY' ? 'CN_TO_MY' : 'MY_TO_CN';
  SUBTITLE_STATE.processingState = 'idle';
  SUBTITLE_STATE.errorState = null;
  SUBTITLE_STATE.mediaInput = null;
  subtitleSetStatus('ယခင် Draft ကို Browser IndexedDB မှ ပြန်ဖော်ပြီးပါပြီ။ Media ဖိုင်ကို ထပ်မံရွေးရန် လိုအပ်ပါသည်။', false);
};

function subtitleGetToken() {
  try { return localStorage.getItem('aics_token') || ''; } catch (error) { return ''; }
}

function subtitleApiPost(path, body) {
  var token = subtitleGetToken();
  if (!token) return Promise.reject(new Error('unauthorized'));
  if (typeof window.aicsApiFetch !== 'function') return Promise.reject(new Error('credentials_unavailable'));
  return window.aicsApiFetch(path, body, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
  }).then(function (response) {
    return response.json().catch(function () { return {}; }).then(function (data) {
      if (!response.ok || data.error) throw new Error(data.error || 'request_failed');
      return data;
    });
  });
}

function subtitleResolveAudioMimeType(file) {
  var mimeType = String(file && file.type || '').toLowerCase().split(';')[0].trim();
  if (mimeType.indexOf('audio/') === 0) return mimeType;
  // Some browsers leave File.type empty or use a generic binary MIME type.
  // Resolve only known audio extensions; never reinterpret a video MIME type.
  if (mimeType && mimeType !== 'application/octet-stream') return '';
  var name = String(file && file.name || '').toLowerCase();
  var extension = name.slice(name.lastIndexOf('.') + 1);
  var audioMimeTypes = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    flac: 'audio/flac'
  };
  return audioMimeTypes[extension] || '';
}

function subtitleGenerateSrt() {
  if (SUBTITLE_STATE.processingState === 'processing') return;
  var input = document.getElementById('subtitleMediaFile');
  var file = input && input.files && input.files[0];
  var outputMode = (document.getElementById('subtitleAudioOutput') || {}).value || 'srt';
  if (!file) { subtitleSetStatus('Audio ဖိုင် ရွေးပေးပါ။', true); return; }
  var mimeType = subtitleResolveAudioMimeType(file);
  if (!mimeType) { subtitleSetStatus('လက်ရှိတွင် Audio ဖိုင်များကိုသာ လက်ခံပါသည်။ MP3, WAV, M4A, AAC, OGG သို့မဟုတ် FLAC ကို ရွေးပါ။', true); return; }
  if (file.size > 5 * 1024 * 1024) { subtitleSetStatus('ဖိုင်သည် 5MB ထက် မကျော်ရပါ။', true); return; }
  var button = document.getElementById('subtitleGenerateBtn');
  var known = document.getElementById('subtitleKnownText');
  var path = outputMode === 'text' ? '/api/studio/subtitle/transcribe' : '/api/studio/subtitle/srt';
  SUBTITLE_STATE.processingState = 'processing';
  if (button) button.disabled = true;
  subtitleSetStatus(outputMode === 'text' ? 'စာသားထုတ်ယူနေပါသည်…' : 'SRT ဖန်တီးနေပါသည်…', false);
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
    subtitleApiPost(path, {
      audioBase64: audioBase64,
      mimeType: mimeType,
      knownText: known ? known.value : '',
      type: outputMode === 'text' ? '1' : '2',
      model: subtitleSelectedModel()
    }).then(function (result) {
      if (outputMode === 'text') {
        var transcript = String(result.text || '');
        if (!transcript.trim()) throw new Error('empty_result');
        SUBTITLE_STATE.transcribedText = transcript;
        var transcriptOutput = document.getElementById('subtitleTranscriptOutput');
        if (transcriptOutput) transcriptOutput.value = transcript;
        subtitleSetStatus('စာသားထုတ်ယူပြီးပါပြီ။ Download လုပ်နိုင်သလို IndexedDB ထဲ သိမ်းနိုင်ပါသည်။', false);
      } else {
        var srt = String(result.srt || '');
        if (!srt.trim()) throw new Error('empty_result');
        SUBTITLE_STATE.sourceSrt = srt;
        SUBTITLE_STATE.editedSrt = srt;
        var editor = document.getElementById('subtitleSrtInput');
        if (editor) { editor.value = srt; editor.focus(); }
        subtitleSetStatus('SRT ဖန်တီးပြီးပါပြီ။ ပြင်ဆင်၊ စစ်ဆေး၊ Download သို့မဟုတ် IndexedDB ထဲ သိမ်းနိုင်ပါသည်။', false);
      }
      SUBTITLE_STATE.processingState = 'done';
      subtitlePersistDraft();
    }).catch(function (error) {
      SUBTITLE_STATE.processingState = 'error';
      SUBTITLE_STATE.errorState = String(error && error.message || 'request_failed');
      var code = SUBTITLE_STATE.errorState;
      var message = code === 'audio_too_large'
        ? 'အသံဖိုင်သည် 5 MB ထက် မကျော်ရပါ။'
        : code === 'credentials_unavailable' || code === 'credentials_not_found'
        ? 'Browser ထဲရှိ Gemini API Key ကို Settings မှ စစ်ဆေးပါ。'
        : code === 'unauthorized' || code === 'invalid_token'
        ? 'Login ဝင်ထားခြင်း မရှိပါ။ ပြန်လည် Login ဝင်ပါ။'
        : code === 'pro_only'
        ? 'ဒီ Feature ကို အသုံးပြုရန် Pro Plan လိုအပ်ပါသည်။'
        : code === 'feature_denied' || code === 'feature_disabled'
        ? 'ဒီ Feature ကို အသုံးပြုခွင့်မရှိသေးပါ။'
        : 'SRT / စာသား ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။';
      subtitleSetStatus(message, true);
    }).finally(function () { if (button) button.disabled = false; });
  };
  reader.readAsDataURL(file);
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

function subtitleDownloadTranscript() {
  var output = document.getElementById('subtitleTranscriptOutput');
  subtitleDownloadText(output ? output.value : '', 'subtitle-transcript.txt', 'Download လုပ်ရန် စာသား မရှိပါ။');
}

function subtitleSaveCreation(kind) {
  var value = '', title = '', original = '', type = '2';
  if (kind === 'transcript') {
    value = (document.getElementById('subtitleTranscriptOutput') || {}).value || '';
    title = 'Subtitle Transcript'; original = 'Audio/Video transcription'; type = '1';
  } else if (kind === 'translated') {
    value = (document.getElementById('subtitleTranslatedOutput') || {}).value || '';
    title = 'Translated Subtitle'; original = (document.getElementById('subtitleTranslationInput') || {}).value || '';
  } else {
    value = (document.getElementById('subtitleSrtInput') || {}).value || '';
    title = 'Subtitle SRT'; original = SUBTITLE_STATE.sourceSrt || '';
  }
  if (!value.trim()) { subtitleSetStatus('သိမ်းရန် ရလဒ် မရှိသေးပါ။', true); return; }
  if (!window.AICS_CREATIONS || typeof window.AICS_CREATIONS.save !== 'function') {
    subtitleSetStatus('Browser IndexedDB Storage မရနိုင်ပါ။', true); return;
  }
  var entered = window.prompt('Creation အမည် ပေးပါ။', title);
  if (entered === null) return;
  window.AICS_CREATIONS.save({
    studio: 'SUBTITLE', type: type, title: String(entered || title).trim().slice(0, 120) || title,
    original_prompt: original, ai_output: value, media_type: '', media_mime: '', media_data: ''
  }).then(function () {
    subtitleSetStatus('ရလဒ်ကို ဤ Browser ၏ IndexedDB ထဲတွင် သိမ်းဆည်းပြီးပါပြီ။', false);
  }).catch(function () {
    subtitleSetStatus('IndexedDB ထဲ သိမ်းဆည်းမအောင်မြင်ပါ။ Storage အခြေအနေကို စစ်ဆေးပါ။', true);
  });
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
  subtitlePersistDraft();
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
    type: '2',
    model: subtitleSelectedModel()
  }).then(function (result) {
    var translated = String(result.srt || '');
    if (!translated.trim()) throw new Error('empty_result');
    SUBTITLE_STATE.translatedSrt = translated;
    var output = document.getElementById('subtitleTranslatedOutput');
    if (output) output.value = translated;
    SUBTITLE_STATE.processingState = 'done';
    subtitleSetStatus('SRT ဘာသာပြန်ပြီးပါပြီ။ ရလဒ်ကို စစ်ဆေးပြီး .srt ဖိုင်အဖြစ် သိမ်းနိုင်ပါသည်။', false);
    subtitlePersistDraft();
  }).catch(function (error) {
    SUBTITLE_STATE.processingState = 'error';
    SUBTITLE_STATE.errorState = String(error && error.message || 'translate_error');
    var code = SUBTITLE_STATE.errorState;
    var message = code === 'unauthorized' || code === 'invalid_token' ? 'Login ဝင်ထားခြင်း မရှိပါ။ ပြန်လည် Login ဝင်ပါ။' :
      code === 'pro_only' ? 'ဒီ Feature ကို အသုံးပြုရန် Pro Plan လိုအပ်ပါသည်။' :
      code === 'feature_denied' || code === 'feature_disabled' ? 'ဒီ Feature ကို အသုံးပြုခွင့်မရှိသေးပါ။' :
      code === 'missing_srt' ? 'ဘာသာပြန်ရန် SRT စာသား ထည့်ပေးပါ။' :
      'SRT ဘာသာပြန်ရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။';
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
  subtitlePersistDraft();
}

(function initSubtitleActions() {
  var generate = document.getElementById('subtitleGenerateBtn');
  var download = document.getElementById('subtitleDownloadBtn');
  var editor = document.getElementById('subtitleSrtInput');
  var translate = document.getElementById('subtitleTranslateBtn');
  var downloadTranslated = document.getElementById('subtitleDownloadTranslatedBtn');
  var validate = document.getElementById('subtitleValidateBtn');
  var sendToTranslation = document.getElementById('subtitleSendToTranslationBtn');
  var sendTranslatedToEditor = document.getElementById('subtitleSendTranslatedToEditorBtn');
  if (generate) generate.addEventListener('click', subtitleGenerateSrt);
  var saveTranscript = document.getElementById('subtitleSaveTranscriptBtn');
  var saveSrt = document.getElementById('subtitleSaveSrtBtn');
  var saveTranslated = document.getElementById('subtitleSaveTranslatedBtn');
  var downloadTranscript = document.getElementById('subtitleDownloadTranscriptBtn');
  if (saveTranscript) saveTranscript.addEventListener('click', function () { subtitleSaveCreation('transcript'); });
  if (saveSrt) saveSrt.addEventListener('click', function () { subtitleSaveCreation('srt'); });
  if (saveTranslated) saveTranslated.addEventListener('click', function () { subtitleSaveCreation('translated'); });
  if (downloadTranscript) downloadTranscript.addEventListener('click', subtitleDownloadTranscript);
  if (download) download.addEventListener('click', subtitleDownloadSrt);
  if (editor) editor.addEventListener('input', function () { SUBTITLE_STATE.editedSrt = editor.value; });
  if (translate) translate.addEventListener('click', subtitleTranslateSrt);
  if (downloadTranslated) downloadTranslated.addEventListener('click', subtitleDownloadTranslatedSrt);
  if (validate) validate.addEventListener('click', subtitleValidateEditorSrt);
  if (sendToTranslation) sendToTranslation.addEventListener('click', subtitleSendEditedSrtToTranslation);
  if (sendTranslatedToEditor) sendTranslatedToEditor.addEventListener('click', subtitleSendTranslatedSrtToEditor);
})();
`;