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

function subtitleDownloadSrt() {
  var editor = document.getElementById('subtitleSrtInput');
  var text = editor ? editor.value : '';
  if (!text.trim()) { subtitleSetStatus('သိမ်းရန် SRT စာသား မရှိပါ။', true); return; }
  var url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  var anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'subtitle.srt';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  subtitleSetStatus('SRT ဖိုင်ကို Browser မှာ သိမ်းဆည်းရန် ပြင်ဆင်ပြီးပါပြီ။', false);
}

(function initSubtitleActions() {
  var generate = document.getElementById('subtitleGenerateBtn');
  var download = document.getElementById('subtitleDownloadBtn');
  var editor = document.getElementById('subtitleSrtInput');
  if (generate) generate.addEventListener('click', subtitleGenerateSrt);
  if (download) download.addEventListener('click', subtitleDownloadSrt);
  if (editor) editor.addEventListener('input', function () { SUBTITLE_STATE.editedSrt = editor.value; });
})();
`;
