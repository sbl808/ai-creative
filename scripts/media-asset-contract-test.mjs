import assert from 'node:assert/strict';
import {
  MEDIA_ASSET_CONTRACT_VERSION,
  MEDIA_ASSET_STUDIO_IDS,
  MEDIA_ASSET_TYPES,
  validateMediaAssetV1,
} from '../worker/src/media-production/contracts/asset.contract.js';

const validAsset = {
  contractVersion: MEDIA_ASSET_CONTRACT_VERSION,
  id: 'asset_001',
  ownerId: 'local-user-001',
  studioId: 'story',
  mediaType: 'image',
  createdAt: '2026-11-10T12:00:00.000Z',
};

assert.deepEqual(MEDIA_ASSET_STUDIO_IDS, [
  'story', 'content', 'short', 'image', 'voice', 'shop',
]);
assert.deepEqual(MEDIA_ASSET_TYPES, ['image', 'audio', 'subtitle']);
assert.deepEqual(validateMediaAssetV1(validAsset), { ok: true, errors: [] });

// Every Studio can own a supported media asset without merging Studio workflows.
for (const studioId of MEDIA_ASSET_STUDIO_IDS) {
  for (const mediaType of MEDIA_ASSET_TYPES) {
    assert.deepEqual(validateMediaAssetV1({
      ...validAsset,
      studioId,
      mediaType,
    }), { ok: true, errors: [] });
  }
}

const invalidVersion = validateMediaAssetV1({
  ...validAsset,
  contractVersion: 99,
});
assert.equal(invalidVersion.ok, false);
assert.ok(invalidVersion.errors.includes('unsupported_contract_version'));

const invalidIdentity = validateMediaAssetV1({
  ...validAsset,
  id: ' ',
  ownerId: '',
});
assert.equal(invalidIdentity.ok, false);
assert.ok(invalidIdentity.errors.includes('invalid_asset_id'));
assert.ok(invalidIdentity.errors.includes('invalid_asset_owner_id'));

const invalidStudio = validateMediaAssetV1({
  ...validAsset,
  studioId: 'unknown',
});
assert.ok(invalidStudio.errors.includes('invalid_studio_id'));

const invalidMediaType = validateMediaAssetV1({
  ...validAsset,
  mediaType: 'video',
});
assert.ok(invalidMediaType.errors.includes('invalid_media_type'));

const invalidTimestamp = validateMediaAssetV1({
  ...validAsset,
  createdAt: 'not-a-timestamp',
});
assert.ok(invalidTimestamp.errors.includes('invalid_asset_created_at'));

const privacySentinel = 'PRIVATE_MEDIA_PAYLOAD_SENTINEL_4b72';
const payloadBearingAsset = validateMediaAssetV1({
  ...validAsset,
  data: privacySentinel,
  apiKey: 'PRIVATE_API_KEY_SENTINEL',
});
assert.equal(payloadBearingAsset.ok, false);
assert.ok(payloadBearingAsset.errors.includes('media_asset_must_not_contain_payload_or_credentials'));
assert.equal(payloadBearingAsset.errors.some((error) => error.includes(privacySentinel)), false);
assert.equal(payloadBearingAsset.errors.some((error) => error.includes('PRIVATE_API_KEY_SENTINEL')), false);

assert.deepEqual(validateMediaAssetV1(null), {
  ok: false,
  errors: ['invalid_media_asset'],
});
assert.deepEqual(validateMediaAssetV1([]), {
  ok: false,
  errors: ['invalid_media_asset'],
});

console.log('Shared Media Asset Contract: PASS');
