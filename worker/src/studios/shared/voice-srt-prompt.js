// Shared CMS-backed SRT prompt builder used by Shop audio workflows.
// Kept outside Voice Studio so Voice can remain TTS-only.

import { getCMSData } from '../../cms/repositories/index.js';
import { buildSrtInstruction } from '../../media-adapters/prompts/srt-prompt.js';
import { buildSystemPrompt } from '../../cms/prompt-templates/index.js';

const CMS_STUDIO = 'VOICE';

const DEFAULT_LINE_RULE =
  'TEXT LINE RULE (အရေးကြီး): Subtitle Block တစ်ခုစီရဲ့ Text Line ကို ' +
  "'အဓိပ္ပါယ်ပြည့်စုံပြီး အလယ်အလတ် ရှည်လျားမှုရှိသော စကားစု (Phrase)' တစ်ခုအလိုက်သာ ခွဲပါ — " +
  'Character အရေအတွက် ရေတွက်၍ လုံးဝ မခွဲပါနှင့်။\n' +
  '- အရမ်းတိုတိုမဖြစ်စေရ: စကားလုံးတစ်လုံး/နှစ်လုံးတည်းနဲ့ Phrase လုံးဝ မဖန်တီးပါနှင့်။\n' +
  '- အရမ်းရှည်လျားလည်း မဖြစ်စေရ: Sentence တစ်ခုလုံး/Clause များစွာ ပေါင်းထားသော ရှည်လျားသည့် ' +
  'Phrase လည်း လုံးဝ မဖန်တီးပါနှင့်။\n' +
  '- ရည်ရွယ်ချက်: Phrase တစ်ခုစီသည် ပုံမှန် Speech ဖြင့် ၁.၅-၃ စက္ကန့်ခန့် ပြောသည့် ပမာဏ ' +
  '(ခန့်မှန်းခြေ စကားလုံး 4-8 လုံး) ရှိသင့်သည်။ Sentence ရှည်ရင် Comma/Breath Pause/Clause ' +
  'အဆုံးတို့တွင် သဘာဝကျစွာ ပိုင်းခြားပါ။\n\n' +
  'ဥပမာ (မှားသော ပုံစံ — Phrase အလွန် တိုနေသည်၊ ဒီလို လုံးဝ မလုပ်ပါနှင့်):\n' +
  '1\n00:00:00,000 --> 00:00:00,700\nဒီနေ့\n\n2\n00:00:00,700 --> 00:00:01,400\nကျွန်တော်တို့\n\n' +
  '3\n00:00:01,400 --> 00:00:02,100\nAI Voice\n\n4\n00:00:02,100 --> 00:00:02,800\nဖန်တီးပြီး\n\n' +
  'ဥပမာ (မှားသော ပုံစံ — Phrase အလွန် ရှည်နေသည်၊ ဒီလို လုံးဝ မလုပ်ပါနှင့်):\n' +
  '1\n00:00:00,000 --> 00:00:05,000\nဒီနေ့ ကျွန်တော်တို့ AI Voice ဖန်တီးပြီး Subtitle လေးတွေ ' +
  'အများကြီး ဆက်တိုက် လုပ်ကြရအောင်\n\n' +
  'ဥပမာ (မှန်ကန်သော ပုံစံ — Phrase အလယ်အလတ်ရှည်လျား၊ ဒီပုံစံအတိုင်း လုပ်ပါ):\n' +
  '1\n00:00:00,000 --> 00:00:01,500\nဒီနေ့ ကျွန်တော်တို့\n\n' +
  '2\n00:00:01,500 --> 00:00:03,000\nAI Voice ဖန်တီးပြီး\n\n' +
  '3\n00:00:03,000 --> 00:00:04,500\nSubtitle လေးတွေ လုပ်ကြမယ်';

export function buildVoiceSrtInstruction(lineRule, knownText) {
  return buildSrtInstruction(lineRule, knownText);
}
export async function buildVoiceSrtPrompt(env, knownText) {
  let lineRule = '';
  try {
    const cms = await getCMSData(env, CMS_STUDIO, 'PRO', '3');
    if (cms) lineRule = buildSystemPrompt(cms);
  } catch {
    // CMS မရနိုင်လျှင် မူလ default rule ကို အသုံးပြုသည်။
  }
  if (!lineRule || !lineRule.trim()) lineRule = DEFAULT_LINE_RULE;
  return buildVoiceSrtInstruction(lineRule, knownText);
}
