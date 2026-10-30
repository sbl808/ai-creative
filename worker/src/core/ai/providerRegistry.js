import { AIServiceError } from './errors.js';
import { callGeminiText, callGeminiImage, callGeminiMultimodal, callGeminiTTS } from './providers/gemini.js';
const PROVIDERS = Object.freeze({
  gemini: Object.freeze({
    generateText: callGeminiText,
    generateImage: callGeminiImage,
    generateMultimodal: callGeminiMultimodal,
    generateSpeech: callGeminiTTS,
  }),
});
export function getAIProvider(providerId) {
  const id = String(providerId || '').trim().toLowerCase();
  const provider = PROVIDERS[id];
  if (!provider) throw new AIServiceError('provider_not_supported', 'provider_not_supported', { provider: id || null });
  return provider;
}
export function listAIProviders() { return Object.keys(PROVIDERS); }
