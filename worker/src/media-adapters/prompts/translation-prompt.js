// Shared SRT translation prompt structure. Studio-specific wording stays in each adapter.
export function buildTranslationPrompt(srtText, direction, instructions) {
  const langInstruction = direction === 'MY_TO_CN'
    ? instructions.myToCn
    : instructions.cnToMy;

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
