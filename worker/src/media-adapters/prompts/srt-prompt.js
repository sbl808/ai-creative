// Shared SRT instruction structure used by Subtitle and Shop audio workflows.
export function buildSrtInstruction(lineRule, knownText) {
  const text = knownText == null ? '' : String(knownText).trim().slice(0, 20000);
  if (!text) {
    return (
      'အောက်ပါ Audio ကို SRT (SubRip Subtitle) format အတိုင်း Transcribe လုပ်ပါ။ ' +
      'Audio ရဲ့ speech pacing ကို ကြည့်ပြီး Timestamp ကို အကြမ်းဖျင်း ခန့်မှန်းပါ။\n\n' +
      lineRule +
      '\n\nSRT format text ကိုသာ ပြန်ပေးပါ၊ ရှင်းလင်းချက် မထည့်ပါနှင့်။'
    );
  }
  return (
    'ပါလာသော Audio သည် အောက်ပါ မူရင်းစာသားကို ဖတ်ထားသော အသံဖြစ်သည်။ ' +
    'မူရင်းစာသားကိုသာ အမှန်အဖြစ် အသုံးပြုပါ — စာလုံး၊ စာလုံးပေါင်း၊ ပုဒ်ဖြတ်ပုဒ်ရပ်ကို ' +
    'မပြောင်း၊ မထည့်၊ မဖျက်ပါနှင့်။ Audio ကို Timestamp ခန့်မှန်းရန်အတွက်သာ (speech pacing ကြည့်၍) သုံးပါ။ ' +
    'ရလဒ်ကို SRT (SubRip Subtitle) format ဖြင့် ပေးပါ။\n\n' +
    lineRule +
    '\n\nမူရင်းစာသား:\n"""\n' + text + '\n"""' +
    '\n\nSRT format text ကိုသာ ပြန်ပေးပါ၊ ရှင်းလင်းချက် မထည့်ပါနှင့်။'
  );
}
