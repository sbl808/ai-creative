import { getCMSData } from '../../cms/repositories/index.js';
import { buildSystemPrompt } from '../../cms/prompt-templates/index.js';

const CMS_STUDIO = 'SUBTITLE';

const DEFAULT_SRT_RULES = [
  'SUBTITLE SRT RULES:',
  '- Audio ထဲမှ ပြောဆိုချက်များကို တိကျစွာ Transcribe လုပ်ပါ။',
  '- Timestamp များကို Audio ၏ speech pacing နှင့် ကိုက်ညီအောင် ခန့်မှန်းပါ။',
  '- Subtitle တစ်ခုစီတွင် အဓိပ္ပါယ်ပြည့်စုံသော အလယ်အလတ်အရှည် Phrase ကို အသုံးပြုပါ။',
  '- စကားလုံး ၁ လုံး၊ ၂ လုံးတည်းဖြင့် အလွန်တိုသော Subtitle မဖန်တီးပါနှင့်။',
  '- Sentence အများအပြားကို Subtitle တစ်ခုတည်းအတွင်း အလွန်ရှည်လျားစွာ မပေါင်းပါနှင့်။',
].join('\\n');

async function loadSubtitleCmsPrompt(env, plan, type) {
  try {
    const row = await getCMSData(env, CMS_STUDIO, plan, type);
    return row ? buildSystemPrompt(row) : '';
  } catch (_) {
    // CMS မရရှိပါက default Subtitle rules ဖြင့် ဆက်လုပ်သည်။
    return '';
  }
}

export async function buildSubtitleSrtPrompt(env, {
  plan = 'PRO',
  type = '2',
  knownText = '',
} = {}) {
  const system = await loadSubtitleCmsPrompt(env, plan, type);
  const sourceText = String(knownText || '').trim().slice(0, 20000);
  const instructions = sourceText
    ? [
        'ပေးထားသော Audio သည် အောက်ပါ မူရင်းစာသားကို ဖတ်ထားသော အသံဖြစ်သည်။',
        'မူရင်းစာသား၏ စာလုံး၊ စာလုံးပေါင်းနှင့် ပုဒ်ဖြတ်ပုဒ်ရပ်များကို မပြောင်းပါနှင့်။',
        'Audio ကို Timestamp နှင့် speech pacing ခန့်မှန်းရန်သာ အသုံးပြုပါ။',
        'မူရင်းစာသားကို အစဉ်လိုက် SRT Subtitle block များအဖြစ် ခွဲပါ။',
        'မူရင်းစာသား:',
        sourceText,
      ].join('\\n')
    : 'အောက်ပါ Audio ကို SRT (SubRip Subtitle) format ဖြင့် Transcribe လုပ်ပါ။';
  return [
    system,
    DEFAULT_SRT_RULES,
    instructions,
    'SRT format ကိုသာ ပြန်ပေးပါ။ ရှင်းလင်းချက် သို့မဟုတ် Markdown code fence မထည့်ပါနှင့်။',
  ].filter(Boolean).join('\\n\\n');
}

export async function buildSubtitleTranslationPrompt(env, {
  srtText,
  direction = 'MY_TO_CN',
  plan = 'PRO',
  type = '2',
} = {}) {
  const source = String(srtText || '').trim();
  if (!source) throw new Error('missing_srt');

  const normalizedDirection = String(direction || 'MY_TO_CN')
    .trim().replace(/-/g, '_').toUpperCase();
  const languageInstruction = normalizedDirection === 'CN_TO_MY'
    ? 'တရုတ်ဘာသာမှ မြန်မာဘာသာသို့ ဘာသာပြန်ပါ။'
    : 'မြန်မာဘာသာမှ တရုတ်ဘာသာသို့ ဘာသာပြန်ပါ။';
  const system = await loadSubtitleCmsPrompt(env, plan, type);

  return [
    system,
    'SUBTITLE TRANSLATION RULES:',
    languageInstruction,
    '- SRT block number နှင့် Timestamp များကို မူရင်းအတိုင်း အတိအကျ ထိန်းသိမ်းပါ။',
    '- မူရင်းစာသားကို မဖျက်ပါနှင့်။ ဘာသာပြန်စာသားကို မူရင်းစာသားအောက်တွင် ထည့်ပါ။',
    '- Subtitle block အသစ် သို့မဟုတ် Timestamp အသစ် မတီထွင်ပါနှင့်။',
    '- မူရင်း SRT block အစဉ်ကို မပြောင်းပါနှင့်။',
    'SRT format ကိုသာ ပြန်ပေးပါ။ ရှင်းလင်းချက် သို့မဟုတ် Markdown code fence မထည့်ပါနှင့်။',
    'INPUT SRT:',
    source,
  ].filter(Boolean).join('\\n\\n');
}
