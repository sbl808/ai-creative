import { createTranslationStudioAdapter } from '../translation/index.js';

function buildVoiceTranslationPrompt(srtText, direction) {
  let langInstruction;
  if (direction === 'MY_TO_CN') {
    langInstruction =
      'အောက်ပါ SRT ထဲက Text များသည် မြန်မာဘာသာ ဖြစ်ပါသည်။ Text line တစ်ကြောင်းစီအောက်မှာ ' +
      'ယင်းစာကြောင်း၏ တရုတ်ဘာသာပြန် line တစ်ကြောင်းကို ထပ်ထည့်ပါ။';
  } else {
    langInstruction =
      'အောက်ပါ SRT ထဲက Text များသည် တရုတ်ဘာသာ ဖြစ်ပါသည်။ Text line တစ်ကြောင်းစီအောက်မှာ ' +
      'ယင်းစာကြောင်း၏ မြန်မာဘာသာပြန် line တစ်ကြောင်းကို ထပ်ထည့်ပါ။ TEXT LINE WRAPPING RULE: ' +
      'ဒီ မြန်မာဘာသာပြန် Line ကို စာလုံးရေ ၁၅ လုံးထက် မကျော်စေရပါ။ ၁၅ လုံးကျော်ရင် Number/Timestamp ' +
      'အသစ် ထပ်မဖန်တီးဘဲ Subtitle block တူညီတဲ့ အတွင်းမှာပဲ ဘာသာပြန် line ကို line အသစ် ထပ်ခွဲပြီး ရေးပါ။';
  }

  return (
    'အောက်ပါ SRT (SubRip Subtitle) Text ကို ဖတ်ပါ။ ' + langInstruction + ' ' +
    'SRT Number (1, 2, 3...) နှင့် Timestamp (00:00:00,000 --> 00:00:03,000 ပုံစံ) များကို ' +
    'လုံးဝ မပြောင်းလဲပါနှင့် — မူရင်းအတိုင်းသာ ထားပါ။ မူရင်း Text Line ကိုလည်း မပြောင်းလဲပါနှင့်၊ ' +
    'ဖျက်လည်း မဖျက်ပါနှင့်။ Format ဥပမာ:\n' +
    '1\n00:00:00,000 --> 00:00:03,000\n[မူရင်းစာကြောင်း]\n[ဘာသာပြန်စာကြောင်း]\n\n' +
    '2\n00:00:03,000 --> 00:00:06,000\n[မူရင်းစာကြောင်း]\n[ဘာသာပြန်စာကြောင်း]\n\n' +
    'SRT format text ကိုသာ ပြန်ပေးပါ၊ ရှင်းလင်းချက် (explanation) မထည့်ပါနှင့်။\n\n' +
    'SRT:\n' + srtText
  );
}

export function createVoiceTranslationAdapter(engine) {
  return createTranslationStudioAdapter('voice', {
    engine,
    buildPrompt: buildVoiceTranslationPrompt,
    defaultDirection: 'MY_TO_CN',
    resolvePlan: (input) => input.plan,
  });
}

const voiceTranslationAdapter = createVoiceTranslationAdapter();

export async function translateVoiceSrtShared(env, input) {
  return voiceTranslationAdapter.translate(env, input);
}
