import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SUBTITLE_HTML } from '../worker/src/frontend/studios/subtitle/page.js';

const page = SUBTITLE_HTML;
assert.match(page, /id="subtitleTranscribe"/);
assert.match(page, /window\.aicsApiFetch\('\/api\/studio\/subtitle\/transcribe'/);
assert.match(page, /Authorization':'Bearer '\+token/);
assert.match(page, /mimeType:file\.type\|\|'audio\/mpeg'/);
assert.match(page, /maxAudioBytes=5\*1024\*1024/);
assert.match(page, /credentials_not_found/);
assert.match(page, /rate_limited/);
assert.match(page, /rate_limit_unavailable/);
assert.match(page, /transcribe_error/);
assert.match(page, /audioBase64=await readAudioBase64\(file\)/);
assert.match(page, /transcript\.value=result/);
const pageScript = page.slice(page.lastIndexOf('<script>'));
assert.doesNotMatch(pageScript, /console\.(?:log|error|warn)\s*\(/);
assert.doesNotMatch(pageScript, /indexedDB\.open|AICS_CREATIONS\.save|AICS_HISTORY\.save/);
assert.doesNotMatch(pageScript, /fetch\(\s*['\"]\/api\/studio\/subtitle\/transcribe/);
assert.match(page, /URL\.revokeObjectURL/);

const sharedUi = await readFile(new URL('../worker/src/frontend/shared-ui.js', import.meta.url), 'utf8');
assert.match(sharedUi, /window\.AICS_BYOK\.withGeminiKey/);
assert.match(sharedUi, /cache: 'no-store'/);
console.log('Subtitle Audio → Text UI integration contract tests passed.');
