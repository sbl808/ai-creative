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
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    cache: 'no-store',
    body: JSON.stringify(body)
  }).then(function (response) {
    return response.json().catch(function () { return {}; }).then(function (data) {
      if (!response.ok) throw new Error(data.error || 'request_failed');
      return data;
    });
  });
}

function subtitleGenerateSrt() {
  if (SUBTITLE_STATE.processingState === 'processing') return;
  var input = document.getElementById('subtitleMediaFile');
  var file = input && input.files && input.files[0];
  if (!file) { subtitleSetStatus('Audio သို့မဟုတ် Video ဖိုင် ရွေးပေးပါ။', true); return; }
  if (file.size > 5 * 1024 * 1024) { subtitleSetStatus('ဖိုင်သည် 5MB ထက် မကျော်ရပါ။', true); return; }
  var button = document.getElementById('subtitleGenerateBtn');
  var known = document.getElementById('subtitleKnownText');
  SUBTITLE_STATE.processingState = 'processing';
  SUBTITLE_STATE.errorState = null;
  if (button) button.disabled = true;
  subtitleSetStatus('SRT ဖန်တီးနေပါသည်…', false);
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
    subtitleApiPost('/api/studio/subtitle/srt', {
      audioBase64: audioBase64,
      mimeType: file.type || 'application/octet-stream',
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
      var message = code === 'unauthorized' || code === 'invalid_token' ? 'Login ဝင်ထားခြင်း မရှိပါ။ ပြန်လည် Login ဝင်ပါ။' :
        code === 'feature_denied' || code === 'feature_disabled' ? 'ဒီ Feature ကို အသုံးပြုခွင့်မရှိသေးပါ။' :
        'SRT ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။';
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
    var message = code === 'unauthorized' || code === 'invalid_token' ? 'Login ဝင်ထားခြင်း မရှိပါ။ ပြန်လည် Login ဝင်ပါ။' :
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
  if (download) download.addEventListener('click', subtitleDownloadSrt);
  if (editor) editor.addEventListener('input', function () { SUBTITLE_STATE.editedSrt = editor.value; });
  if (translate) translate.addEventListener('click', subtitleTranslateSrt);
  if (downloadTranslated) downloadTranslated.addEventListener('click', subtitleDownloadTranslatedSrt);
  if (validate) validate.addEventListener('click', subtitleValidateEditorSrt);
  if (sendToTranslation) sendToTranslation.addEventListener('click', subtitleSendEditedSrtToTranslation);
  if (sendTranslatedToEditor) sendTranslatedToEditor.addEventListener('click', subtitleSendTranslatedSrtToEditor);
})();
`;