export const AI_TASKS_BY_CATEGORY = {
  text: ['story.text', 'content.text', 'short.text', 'image.text', 'shop.text'],
  image: ['story.image', 'content.image', 'short.image', 'image.image', 'shop.image'],
  voice: ['content.voice', 'voice.voice'],
  transcribe: ['content.transcribe', 'voice.transcribe'],
};
export const AI_CAPABILITIES_BY_CATEGORY = {
  text: ['text-generation', 'text-revision', 'multimodal-input'],
  image: ['image-generation'],
  voice: ['text-to-speech'],
  transcribe: ['audio-transcription', 'subtitle-generation', 'text-translation'],
};
export const AI_MODEL_REGISTRY = [
  { id: 'gemini-3.5-flash-lite', name: 'သာမန်', category: 'text', provider: 'gemini', capabilities: AI_CAPABILITIES_BY_CATEGORY.text, supported_tasks: AI_TASKS_BY_CATEGORY.text, status: 'active', enabled: true, is_default: true, plan_access: 'FREE' },
  { id: 'gemini-3.1-flash-lite-image', name: 'သာမန်', category: 'image', provider: 'gemini', capabilities: AI_CAPABILITIES_BY_CATEGORY.image, supported_tasks: AI_TASKS_BY_CATEGORY.image, status: 'active', enabled: true, is_default: true, plan_access: 'FREE' },
  { id: 'gemini-2.5-flash-preview-tts', name: 'သာမန်', category: 'voice', provider: 'gemini', capabilities: AI_CAPABILITIES_BY_CATEGORY.voice, supported_tasks: AI_TASKS_BY_CATEGORY.voice, status: 'active', enabled: true, is_default: true, plan_access: 'FREE' },
  { id: 'gemini-3.6-flash', name: 'သာမန်', category: 'transcribe', provider: 'gemini', capabilities: AI_CAPABILITIES_BY_CATEGORY.transcribe, supported_tasks: AI_TASKS_BY_CATEGORY.transcribe, status: 'active', enabled: true, is_default: true, plan_access: 'FREE' },
];
export const DEFAULT_MODELS = {
  text: 'gemini-3.5-flash-lite',
  image: 'gemini-3.1-flash-lite-image',
  voice: 'gemini-2.5-flash-preview-tts',
  transcribe: 'gemini-3.6-flash',
};
export const MODEL_CATEGORIES = ['text', 'image', 'voice', 'transcribe'];
