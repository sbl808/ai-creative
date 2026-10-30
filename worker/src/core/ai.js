// Backward-compatible AI facade. Provider routing lives in core/ai/.
import { generateText, generateImage, generateMultimodal, generateSpeech } from './ai/aiService.js';
export { validateMultimodalInputs } from './ai/providers/gemini.js';
export const callGeminiText = (env,args) => generateText(env,args);
export const callGeminiImage = (env,args) => generateImage(env,args);
export const callGeminiMultimodal = (env,args) => generateMultimodal(env,args);
export const callGeminiTTS = (env,args) => generateSpeech(env,args);
