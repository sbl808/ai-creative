// AI Creative Studio — Subtitle Studio / helpers.js
// Pure browser helpers; never log user-provided media or subtitle text.
export const HELPERS_SCRIPT = `
function subtitleEscapeHtml(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/\\\"/g, '&quot;').replace(/'/g, '&#39;');
}

function subtitleParseTimestamp(value) {
  var match = String(value || '').trim().match(/^(\\d{2,}):(\\d{2}):(\\d{2}),(\\d{3})$/);
  if (!match) return null;
  var hours = Number(match[1]), minutes = Number(match[2]), seconds = Number(match[3]), ms = Number(match[4]);
  if (!Number.isSafeInteger(hours) || minutes > 59 || seconds > 59) return null;
  return (((hours * 60 + minutes) * 60 + seconds) * 1000) + ms;
}

function subtitleFormatTimestamp(milliseconds) {
  var value = Number(milliseconds);
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid subtitle timestamp');
  value = Math.floor(value);
  return String(Math.floor(value / 3600000)).padStart(2, '0') + ':' +
    String(Math.floor((value % 3600000) / 60000)).padStart(2, '0') + ':' +
    String(Math.floor((value % 60000) / 1000)).padStart(2, '0') + ',' +
    String(value % 1000).padStart(3, '0');
}

function subtitleValidateSrt(input) {
  var text = String(input == null ? '' : input).replace(/\\r\\n?/g, '\\n').trim();
  var errors = [], cues = [];
  if (!text) return { valid: false, errors: ['SRT စာသား ဗလာဖြစ်နေပါသည်။'], cues: [] };
  var blocks = text.split(/\\n[ \\t]*\\n+/);
  for (var i = 0; i < blocks.length; i++) {
    var lines = blocks[i].split('\\n'), indexLine = (lines.shift() || '').trim(), number = Number(indexLine);
    if (!/^\\d+$/.test(indexLine) || !Number.isSafeInteger(number) || number < 1) {
      errors.push('အပိုင်း ' + (i + 1) + ' — Subtitle Number မမှန်ကန်ပါ။'); continue;
    }
    var timing = (lines.shift() || '').trim().match(/^(\\d{2,}:\\d{2}:\\d{2},\\d{3})\\s*-->\\s*(\\d{2,}:\\d{2}:\\d{2},\\d{3})$/);
    if (!timing) { errors.push('အပိုင်း ' + (i + 1) + ' — Timestamp ပုံစံ မမှန်ကန်ပါ။'); continue; }
    var start = subtitleParseTimestamp(timing[1]), end = subtitleParseTimestamp(timing[2]);
    if (start === null || end === null || end <= start) { errors.push('အပိုင်း ' + (i + 1) + ' — Timestamp အချိန် မမှန်ကန်ပါ။'); continue; }
    var cueText = lines.join('\\n').trim();
    if (!cueText) { errors.push('အပိုင်း ' + (i + 1) + ' — Subtitle စာသား မရှိပါ။'); continue; }
    cues.push({ number: number, start: start, end: end, text: cueText });
  }
  return { valid: errors.length === 0 && cues.length > 0, errors: errors, cues: cues };
}

function subtitleFriendlyError(code) {
  var messages = {
    missing_audio: 'အသံ သို့မဟုတ် ဗီဒီယိုဖိုင် ရွေးပေးပါ။',
    missing_srt: 'SRT စာသား ထည့်ပေးပါ။',
    unauthorized: 'Login ဝင်ထားခြင်း မရှိပါ။ ပြန်လည် Login ဝင်ပါ။',
    invalid_token: 'Login သက်တမ်းကုန်ဆုံးသွားပါသည်။ ပြန်လည် Login ဝင်ပါ။',
    feature_denied: 'ဒီ Feature ကို သင့် Plan နဲ့ အသုံးပြုခွင့်မရှိသေးပါ။',
    feature_disabled: 'ဒီ Feature ကို လောလောဆယ် ပိတ်ထားပါသည်။',
    srt_error: 'SRT ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။'
  };
  return messages[String(code || '')] || 'ဆောင်ရွက်ရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။';
}
`;
