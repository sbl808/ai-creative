// AI Creative Studio — Subtitle Studio / helpers.js
// Pure browser-side helpers. No network calls, storage, or automatic content rewriting.

export const HELPERS_SCRIPT = `
function subtitleEscapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\\\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function subtitleParseTimestamp(value) {
  var match = String(value || '').trim().match(/^(\\d{2,}):(\\d{2}):(\\d{2}),(\\d{3})$/);
  if (!match) return null;

  var hours = Number(match[1]);
  var minutes = Number(match[2]);
  var seconds = Number(match[3]);
  var milliseconds = Number(match[4]);

  if (!Number.isSafeInteger(hours) || minutes > 59 || seconds > 59) return null;
  return (((hours * 60 + minutes) * 60 + seconds) * 1000) + milliseconds;
}

function subtitleFormatTimestamp(milliseconds) {
  var value = Number(milliseconds);
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.floor(value))) {
    throw new RangeError('Invalid subtitle timestamp');
  }

  value = Math.floor(value);
  var hours = Math.floor(value / 3600000);
  var minutes = Math.floor((value % 3600000) / 60000);
  var seconds = Math.floor((value % 60000) / 1000);
  var ms = value % 1000;

  return String(hours).padStart(2, '0') + ':' +
    String(minutes).padStart(2, '0') + ':' +
    String(seconds).padStart(2, '0') + ',' +
    String(ms).padStart(3, '0');
}

function subtitleValidateSrt(input) {
  var text = String(input == null ? '' : input).replace(/\\r\\n?/g, '\\n').trim();
  var errors = [];
  var cues = [];

  if (!text) {
    return { valid: false, errors: ['SRT စာသား ဗလာဖြစ်နေပါသည်။'], cues: [] };
  }

  var blocks = text.split(/\\n[ \\t]*\\n+/);
  for (var i = 0; i < blocks.length; i++) {
    var lines = blocks[i].split('\\n');
    var indexLine = (lines.shift() || '').trim();
    var cueNumber = Number(indexLine);

    if (!/^\\d+$/.test(indexLine) || !Number.isSafeInteger(cueNumber) || cueNumber < 1) {
      errors.push('အပိုင်း ' + (i + 1) + ' — Subtitle Number မမှန်ကန်ပါ။');
      continue;
    }

    var timingLine = (lines.shift() || '').trim();
    var timing = timingLine.match(/^(\\d{2,}:\\d{2}:\\d{2},\\d{3})\\s*-->\\s*(\\d{2,}:\\d{2}:\\d{2},\\d{3})$/);
    if (!timing) {
      errors.push('အပိုင်း ' + (i + 1) + ' — Timestamp ပုံစံ မမှန်ကန်ပါ။');
      continue;
    }

    var start = subtitleParseTimestamp(timing[1]);
    var end = subtitleParseTimestamp(timing[2]);
    if (start === null || end === null || end <= start) {
      errors.push('အပိုင်း ' + (i + 1) + ' — Timestamp အချိန်အစ/အဆုံး မမှန်ကန်ပါ။');
      continue;
    }

    var cueText = lines.join('\\n').trim();
    if (!cueText) {
      errors.push('အပိုင်း ' + (i + 1) + ' — Subtitle စာသား မရှိပါ။');
      continue;
    }

    cues.push({
      number: cueNumber,
      start: start,
      end: end,
      text: cueText
    });
  }

  return { valid: errors.length === 0 && cues.length > 0, errors: errors, cues: cues };
}

function subtitleShortHint(value) {
  var text = String(value == null ? '' : value).replace(/\\s+/g, ' ').trim();
  return text.length > 90 ? text.slice(0, 87) + '…' : text;
}

function subtitleFriendlyError(code) {
  var messages = {
    missing_audio: 'အသံ သို့မဟုတ် ဗီဒီယိုဖိုင် ရွေးပေးပါ။',
    missing_srt: 'SRT စာသား ထည့်ပေးပါ။',
    invalid_srt: 'SRT ဖွဲ့စည်းပုံ မမှန်ကန်ပါ။ Timestamp နှင့် Subtitle Number များကို စစ်ဆေးပါ။',
    translate_error: 'ဘာသာပြန်ရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။',
    transcribe_error: 'စာတန်းထိုး ဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။',
    unauthorized: 'Login ဝင်ထားခြင်း မရှိပါ။ ပြန်လည် Login ဝင်ပါ။',
    feature_denied: 'ဒီ Feature ကို သင့် Plan နဲ့ အသုံးပြုခွင့်မရှိသေးပါ။'
  };
  return messages[String(code || '')] || 'ဆောင်ရွက်ရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏအကြာတွင် ထပ်မံကြိုးစားပါ။';
}
`;
