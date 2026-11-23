import { createTranslationStudioAdapter } from '../translation/index.js';
import { buildTranslationPrompt } from '../prompts/translation-prompt.js';

function buildSubtitleTranslationPrompt(srtText, direction) {
  return buildTranslationPrompt(srtText, direction, {
    myToCn: 'အောက်ပါ SRT ထဲက Text များသည် မြန်မာဘာသာ ဖြစ်ပါသည်။ Text line တစ်ကြောင်းစီအောက်မှာ ' +
      'ယင်းစာကြောင်း၏ တရုတ်ဘာသာပြန် line တစ်ကြောင်းကို ထပ်ထည့်ပါ။',
    cnToMy: 'အောက်ပါ SRT ထဲက Text များသည် တရုတ်ဘာသာ ဖြစ်ပါသည်။ Text line တစ်ကြောင်းစီအောက်မှာ ' +
      'ယင်းစာကြောင်း၏ မြန်မာဘာသာပြန် line တစ်ကြောင်းကို ထပ်ထည့်ပါ။ TEXT LINE WRAPPING RULE: ' +
      'ဒီ မြန်မာဘာသာပြန် Line ကို စာလုံးရေ ၁၅ လုံးထက် မကျော်စေရပါ။ ၁၅ လုံးကျော်ရင် Number/Timestamp ' +
      'အသစ် မဖန်တီးဘဲ Subtitle block တူညီတဲ့အတွင်းမှာပဲ ဘာသာပြန် line ကို line အသစ် ထပ်ခွဲပြီး ရေးပါ။',
  });
}
export function createSubtitleTranslationAdapter(engine) {
  return createTranslationStudioAdapter('subtitle', {
    engine,
    buildPrompt: buildSubtitleTranslationPrompt,
    defaultDirection: 'MY_TO_CN',
    resolvePlan: (input) => input.plan,
  });
}

const subtitleTranslationAdapter = createSubtitleTranslationAdapter();

export async function translateSubtitleSrtShared(env, input) {
  return subtitleTranslationAdapter.translate(env, input);
}
