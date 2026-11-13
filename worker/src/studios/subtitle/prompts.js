import { getCMSData } from '../../cms/repositories/index.js';
import { buildSystemPrompt } from '../../cms/prompt-templates/index.js';

const CMS_STUDIO = 'SUBTITLE';
const CMS_GENERATE_TYPE = 'SRT_GENERATE';

const DEFAULT_SRT_RULES = [
  'SUBTITLE SRT GENERATION RULES:',
  '- Audio ထဲမှ ပြောဆိုချက်များကို အဓိပ္ပါယ်မပျက် တိကျစွာ Transcribe လုပ်ပါ။',
  '- Subtitle တစ်ခုစီကို အဓိပ္ပါယ်ပြည့်စုံသော သဘာဝကျသည့် အလယ်အလတ်အရှည် Phrase အလိုက် ခွဲပါ။',
  '- စကားလုံး ၁ လုံး၊ ၂ လုံးတည်းပါသော အလွန်တိုသည့် Subtitle များကို မလိုအပ်ဘဲ မဖန်တီးပါနှင့်။',
  '- Sentence အများအပြား သို့မဟုတ် Clause များစွာကို Subtitle တစ်ခုတည်းအတွင်း အလွန်ရှည်လျားစွာ မပေါင်းပါနှင့်။',
  '- သဘာဝကျသော စကားပြောရပ်နားမှု၊ ဝါကျဖွဲ့စည်းပုံနှင့် အဓိပ္ပါယ်အဆက်အစပ်အလိုက် ခွဲပါ။',
  '- Timestamp များသည် Audio ၏ အမှန်တကယ် speech pacing နှင့် အနီးစပ်ဆုံး ကိုက်ညီရမည်။',
  '- Subtitle block များ၏ နံပါတ်စဉ်ကို 1 မှ စ၍ အစဉ်လိုက် သတ်မှတ်ပါ။',
  '- မကြားရသော စကားလုံးများကို မခန့်မှန်းတီထွင်ပါနှင့်။',
].join('\\n');

async function loadSubtitleCmsPrompt(env, plan, type) {
  try {
    const row = await getCMSData(env, CMS_STUDIO, plan, type);
    return row ? buildSystemPrompt(row) : '';
  } catch (_) {
    // CMS မရရှိပါက သက်ဆိုင်ရာ Default rules ဖြင့် ဆက်လုပ်သည်။
    return '';
  }
}

async function loadSubtitleGenerateCmsPrompt(env, plan, legacyType) {
  // Canonical record ကို ဦးစားပေးပြီး၊ Admin က record မဖန်တီးရသေးချိန်တွင်
  // လက်ရှိ SUBTITLE/PRO/2 record ကို fallback အဖြစ် ဆက်လက်အသုံးပြုသည်။
  const canonical = await loadSubtitleCmsPrompt(env, plan, CMS_GENERATE_TYPE);
  if (canonical) return canonical;

  const legacy = String(legacyType || '').trim();
  if (legacy && legacy !== CMS_GENERATE_TYPE) {
    return loadSubtitleCmsPrompt(env, plan, legacy);
  }
  return '';
}

export async function buildSubtitleSrtPrompt(env, {
  plan = 'PRO',
  type = '2',
  knownText = '',
} = {}) {
  const system = await loadSubtitleGenerateCmsPrompt(env, plan, type);
  const sourceText = String(knownText || '').trim().slice(0, 20000);
  const instructions = sourceText
    ? [
        'ပေးထားသော Audio သည် အောက်ပါ မူရင်းစာသားကို ဖတ်ထားသော အသံဖြစ်သည်။',
        'မူရင်းစာသား၏ စာလုံး၊ စာလုံးပေါင်း၊ ပုဒ်ဖြတ်ပုဒ်ရပ်နှင့် စာသားအစဉ်ကို မပြောင်းပါနှင့်။',
        'စာသားကို မထည့်၊ မဖျက်၊ မပြန်ရေးပါနှင့်။',
        'Audio ကို Timestamp နှင့် speech pacing ခန့်မှန်းရန်သာ အသုံးပြုပါ။',
        'မူရင်းစာသားကို အစဉ်လိုက် SRT Subtitle block များအဖြစ် သဘာဝကျစွာ ခွဲပါ။',
        'မူရင်းစာသား:',
        sourceText,
      ].join('\\n')
    : 'အောက်ပါ Audio ကို SRT (SubRip Subtitle) format ဖြင့် တိကျစွာ Transcribe လုပ်ပါ။';
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
