import {
  VIDEO_PLAN_CONTRACT_VERSION,
  validateVideoPlanV1,
} from '../contracts/video-plan.v1.js';

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function positiveNumber(value, fallback) {
  const number = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function uniqueId(value, fallback, used) {
  const candidate = text(value) || fallback;
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }

  let suffix = 2;
  let next = candidate + '_' + suffix;
  while (used.has(next)) {
    suffix += 1;
    next = candidate + '_' + suffix;
  }
  used.add(next);
  return next;
}

function normalizeCharacters(sourceCharacters) {
  const usedIds = new Set();
  const aliases = new Map();

  const characters = (Array.isArray(sourceCharacters) ? sourceCharacters : [])
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item, index) => {
      const fallbackId = 'char_' + String(index + 1).padStart(2, '0');
      const id = uniqueId(item.id, fallbackId, usedIds);
      const name = text(item.name) || 'Character ' + (index + 1);
      const character = {
        id,
        name,
        role: text(item.role) || 'Main Character',
        age: text(item.age || item.ageRange),
        description: text(item.description),
        characterPrompt: text(item.characterPrompt || item.prompt),
        referenceImage: text(item.referenceImage),
      };

      aliases.set(id, id);
      aliases.set(name.toLowerCase(), id);
      if (text(item.id)) aliases.set(text(item.id), id);
      return character;
    });

  return { characters, aliases };
}

function normalizeScenes(sourceScenes, aliases) {
  const usedIds = new Set();

  return (Array.isArray(sourceScenes) ? sourceScenes : [])
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item, index) => {
      const parsedNumber = Number.parseInt(item.number, 10);
      const number = Number.isInteger(parsedNumber) && parsedNumber > 0
        ? parsedNumber
        : index + 1;
      const id = uniqueId(
        item.id,
        'scene_' + String(number).padStart(2, '0'),
        usedIds,
      );

      const rawCharacterIds = Array.isArray(item.characterIds)
        ? item.characterIds
        : [];
      const characterIds = [...new Set(rawCharacterIds
        .map((value) => {
          const key = text(value);
          return aliases.get(key) || aliases.get(key.toLowerCase()) || null;
        })
        .filter(Boolean))];

      const visualPrompt = text(item.visualPrompt);
      const description = text(item.description);

      return {
        id,
        number,
        title: text(item.title),
        duration: positiveNumber(item.duration, 8),
        characterIds,
        description,
        visualDescription: text(item.visualDescription) || visualPrompt,
        videoPrompt: text(item.videoPrompt) || visualPrompt,
        environmentPrompt: text(item.environmentPrompt),
        dialogue: text(item.dialogue),
        emotion: text(item.emotion),
        camera: text(item.camera),
        lighting: text(item.lighting),
        location: text(item.location),
        visualStyle: text(item.visualStyle),
      };
    });
}

/**
 * Convert a Studio parser result into the stable Shared Video Plan v1 shape.
 * This helper is pure: it does not persist, log, or transmit user content.
 */
export function createAdaptedVideoPlan({
  studioId,
  source,
  product = null,
  studioData,
} = {}) {
  const input = source && typeof source === 'object' && !Array.isArray(source)
    ? source
    : {};
  const { characters, aliases } = normalizeCharacters(input.characters);
  const scenes = normalizeScenes(input.scenes, aliases);

  const plan = {
    contractVersion: VIDEO_PLAN_CONTRACT_VERSION,
    studioId,
    product: product === null ? null : {
      name: text(product.name) || '(ကုန်ပစ္စည်း)',
      prompt: text(product.prompt),
    },
    characters,
    scenes,
    rawFallback: input.rawFallback === true,
    ...(studioData === undefined ? {} : { studioData }),
  };

  const validation = validateVideoPlanV1(plan);
  if (!validation.ok) {
    throw new TypeError('invalid_adapted_video_plan:' + validation.errors.join(','));
  }

  return plan;
}
