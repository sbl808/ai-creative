import { transcribeSubtitleAudio as transcribeSharedSubtitleAudio } from '../../media-adapters/subtitle/audio.adapter.js';

const SUBTITLE_TRANSCRIPTION_PROMPT =
  'အောက်ပါ Audio ထဲတွင် ပြောဆိုထားသော စကားများကို မူရင်းအတိုင်း တိကျစွာ စာသားအဖြစ် ပြောင်းပါ။ ' +
  'မကြားရသော စကားလုံးကို မခန့်မှန်းပါနှင့်။ အပိုရှင်းလင်းချက်၊ ခေါင်းစဉ် သို့မဟုတ် Markdown မထည့်ဘဲ ' +
  'Transcribe လုပ်ထားသော စာသားကိုသာ ပြန်ပေးပါ။';

export async function transcribeSubtitleAudio(env, {
  audioBase64,
  mimeType = 'audio/mpeg',
  apiKey,
  model,
  plan,
} = {}) {
  if (!audioBase64) throw new Error('missing_audio');
  return transcribeSharedSubtitleAudio(env, {
    audioBase64,
    mimeType,
    apiKey,
    model,
    plan,
    prompt: SUBTITLE_TRANSCRIPTION_PROMPT,
  });
}
