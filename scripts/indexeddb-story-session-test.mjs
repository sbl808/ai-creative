#!/usr/bin/env node
/**
 * IndexedDB Story Studio Session persistence and restore behavior tests.
 * Run: node --experimental-default-type=module scripts/indexeddb-story-session-test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { databaseScript } from '../worker/src/frontend/storage/database.js';
import { storageErrorsScript } from '../worker/src/frontend/storage/storage-errors.js';
import { storageOwnerScript } from '../worker/src/frontend/storage/storage-owner.js';
import { sessionsRepositoryScript } from '../worker/src/frontend/storage/repositories/sessions.js';
import { sessionResultsRepositoryScript } from '../worker/src/frontend/storage/repositories/session-results.js';

const source = [
  databaseScript(),
  storageErrorsScript(),
  storageOwnerScript(),
  sessionsRepositoryScript(),
  sessionResultsRepositoryScript()
].join('\n');

new vm.Script(source, { filename: 'session-results-repository.js' });
assert.match(source, /window\.AICS_SESSION_RESULTS\s*=\s*\{/);
assert.match(source, /continuePrimaryKey/);
assert.match(source, /window\.AICS_SESSIONS\s*=\s*\{/);
assert.match(source, /continuePrimaryKey/);
assert.match(source, /owner_sessionId/);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function compareKeys(left, right) {
  if (Array.isArray(left) && Array.isArray(right)) {
    const length = Math.max(left.length, right.length);
    for (let i = 0; i < length; i++) {
      const result = compareKeys(left[i], right[i]);
      if (result) return result;
    }
    return 0;
  }
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function keyPathValue(record, keyPath) {
  if (Array.isArray(keyPath)) return keyPath.map((part) => record[part]);
  return record[keyPath];
}

class FakeKeyRange {
  constructor(lower, upper, lowerOpen, upperOpen, only) {
    this.lower = lower;
    this.upper = upper;
    this.lowerOpen = Boolean(lowerOpen);
    this.upperOpen = Boolean(upperOpen);
    this.only = Boolean(only);
  }
  includes(value) {
    if (this.only) return compareKeys(value, this.lower) === 0;
    const low = compareKeys(value, this.lower);
    const high = compareKeys(value, this.upper);
    return (low > 0 || (low === 0 && !this.lowerOpen))
      && (high < 0 || (high === 0 && !this.upperOpen));
  }
  static bound(lower, upper, lowerOpen, upperOpen) {
    return new FakeKeyRange(lower, upper, lowerOpen, upperOpen, false);
  }
  static only(value) {
    return new FakeKeyRange(value, value, false, false, true);
  }
}

function createFakeIndexedDB() {
  const records = new Map();
  const definitions = new Map();
  let version = 0;

  function makeRequest(transaction, operation) {
    const request = { result: undefined, error: null, onsuccess: null, onerror: null };
    transaction.pending++;
    queueMicrotask(() => {
      if (transaction.aborted) {
        transaction.pending--;
        transaction.scheduleCompletion();
        return;
      }
      try {
        request.result = operation();
        if (request.onsuccess) request.onsuccess();
      } catch (error) {
        request.error = error;
        transaction.error = error;
        if (request.onerror) request.onerror();
        if (transaction.onerror) transaction.onerror();
      }
      transaction.pending--;
      transaction.scheduleCompletion();
    });
    return request;
  }

  function makeCursorRequest(transaction, entries, direction, onDelete) {
    const request = { result: null, error: null, onsuccess: null, onerror: null };
    const ordered = entries.slice().sort((a, b) => {
      const keyOrder = compareKeys(a.key, b.key);
      const primaryOrder = compareKeys(a.primaryKey, b.primaryKey);
      const order = keyOrder || primaryOrder;
      return direction === 'prev' ? -order : order;
    });
    let position = 0;
    transaction.pending++;

    function emit() {
      queueMicrotask(() => {
        if (transaction.aborted) {
          transaction.pending--;
          transaction.scheduleCompletion();
          return;
        }
        const entry = ordered[position] || null;
        if (!entry) {
          request.result = null;
          if (request.onsuccess) request.onsuccess();
          transaction.pending--;
          transaction.scheduleCompletion();
          return;
        }

        let continued = false;
        const cursor = {
          key: clone(entry.key),
          primaryKey: clone(entry.primaryKey),
          value: clone(entry.value),
          continue() {
            continued = true;
            position++;
            emit();
          },
          continuePrimaryKey(key, primaryKey) {
            continued = true;
            const target = { key, primaryKey };
            position = ordered.findIndex((candidate) => {
              const keyCompare = compareKeys(candidate.key, target.key);
              const pairCompare = keyCompare || compareKeys(candidate.primaryKey, target.primaryKey);
              return direction === 'prev' ? pairCompare < 0 : pairCompare > 0;
            });
            if (position < 0) position = ordered.length;
            emit();
          },
          delete() {
            onDelete(entry.primaryKey);
          }
        };
        request.result = cursor;
        if (request.onsuccess) request.onsuccess();
        if (!continued) {
          transaction.pending--;
          transaction.scheduleCompletion();
        }
      });
    }

    emit();
    return request;
  }

  const database = {
    objectStoreNames: {
      contains(name) { return records.has(name); }
    },
    createObjectStore(name, options) {
      records.set(name, new Map());
      definitions.set(name, { keyPath: options && options.keyPath, indexes: new Map() });
      return {
        createIndex(indexName, keyPath) {
          definitions.get(name).indexes.set(indexName, keyPath);
        }
      };
    },
    close() {},
    transaction(storeNames, mode) {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      for (const name of names) {
        if (!records.has(name)) throw new Error('NotFoundError');
      }
      const transaction = {
        mode,
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        pending: 0,
        aborted: false,
        completionQueued: false,
        scheduleCompletion() {
          if (this.pending || this.completionQueued || this.aborted) return;
          this.completionQueued = true;
          queueMicrotask(() => {
            this.completionQueued = false;
            if (!this.pending && !this.aborted && this.oncomplete) this.oncomplete();
          });
        },
        abort() {
          if (this.aborted) return;
          this.aborted = true;
          queueMicrotask(() => { if (this.onabort) this.onabort(); });
        },
        objectStore(name) {
          if (!names.includes(name)) throw new Error('NotFoundError');
          const map = records.get(name);
          const definition = definitions.get(name);
          const ensureWritable = () => {
            if (mode !== 'readwrite') throw new Error('ReadOnlyError');
          };
          const store = {
            get(id) {
              return makeRequest(transaction, () => clone(map.get(id)));
            },
            add(value) {
              ensureWritable();
              return makeRequest(transaction, () => {
                const key = value[definition.keyPath];
                if (map.has(key)) throw new Error('ConstraintError');
                map.set(key, clone(value));
                return key;
              });
            },
            put(value) {
              ensureWritable();
              return makeRequest(transaction, () => {
                const key = value[definition.keyPath];
                map.set(key, clone(value));
                return key;
              });
            },
            delete(id) {
              ensureWritable();
              return makeRequest(transaction, () => map.delete(id));
            },
            index(indexName) {
              const indexKeyPath = definition.indexes.get(indexName);
              if (!indexKeyPath) throw new Error('NotFoundError');
              function matchingEntries(range) {
                const result = [];
                for (const [primaryKey, value] of map.entries()) {
                  const key = keyPathValue(value, indexKeyPath);
                  if (!range || range.includes(key)) {
                    result.push({ key, primaryKey, value });
                  }
                }
                return result;
              }
              return {
                getAll(query) {
                  return makeRequest(transaction, () => matchingEntries(
                    query instanceof FakeKeyRange ? query : null
                  ).map((entry) => clone(entry.value)));
                },
                openCursor(range, direction) {
                  const entries = matchingEntries(range);
                  return makeCursorRequest(
                    transaction,
                    entries,
                    direction || 'next',
                    (primaryKey) => {
                      ensureWritable();
                      map.delete(primaryKey);
                    }
                  );
                }
              };
            }
          };
          return store;
        }
      };
      return transaction;
    }
  };

  return {
    records,
    database,
    get version() { return version; },
    open(name, requestedVersion) {
      const request = {
        result: null,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null
      };
      queueMicrotask(() => {
        request.result = database;
        if (requestedVersion > version) {
          const oldVersion = version;
          version = requestedVersion;
          if (request.onupgradeneeded) {
            request.onupgradeneeded({ oldVersion, newVersion: version });
          }
        }
        if (request.onsuccess) request.onsuccess();
      });
      return request;
    }
  };
}

function makeToken(subject) {
  return 'header.' + Buffer.from(JSON.stringify({ sub: subject })).toString('base64url') + '.signature';
}

const fixedTime = '2026-11-01T10:00:00.000Z';
class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [fixedTime]));
  }
  static now() {
    return new Date(fixedTime).getTime();
  }
}

let activeToken = makeToken('user-a');
const fakeIndexedDB = createFakeIndexedDB();
const localStorage = {
  getItem(key) { return key === 'aics_token' ? activeToken : null; }
};
const window = {
  indexedDB: { open: (name, requestedVersion) => fakeIndexedDB.open(name, requestedVersion) },
  IDBKeyRange: FakeKeyRange
};
const context = {
  window,
  localStorage,
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
  Date: FixedDate,
  Math,
  Promise,
  JSON,
  String,
  Error,
  Array,
  Object,
  Number,
  isFinite,
  encodeURIComponent,
  decodeURIComponent
};

vm.runInNewContext(source, context, { timeout: 1000 });


const storyState = await import('../worker/src/frontend/studios/story/state.js');
const storyHelpers = await import('../worker/src/frontend/studios/story/helpers.js');
const storyActions = await import('../worker/src/frontend/studios/story/actions.js');

const sessionDraft = {
  fields: { topic: 'A lost city beneath the ocean', tone: 'adventure' },
  story: 'The explorers discovered an ancient city...',
  storyIdea: 'An underwater civilization',
  workflow: { step: 3, selectedStyle: 'cinematic' },
  characters: [{ id: 'character-1', name: 'Mira', role: 'Explorer' }],
  scenes: [{ id: 'scene-1', description: 'The city gates open' }]
};

const storySession = await window.AICS_SESSIONS.create({
  studio: 'STORY',
  title: 'Underwater Adventure',
  draft: sessionDraft
});
assert.equal(storySession.studio, 'STORY');
assert.equal(storySession.ownerId, 'user-a');
assert.deepEqual(JSON.parse(JSON.stringify(storySession.draft)), sessionDraft,
  'Story Studio draft fields must persist in the session record');

const characterImage = 'data:image/png;base64,aGVsbG8tY2hhcmFjdGVy';
const environmentImage = 'data:image/png;base64,aGVsbG8tZW52aXJvbm1lbnQ';
const savedCharacterImage = await window.AICS_SESSION_RESULTS.create({
  sessionId: storySession.id,
  type: 'story_image',
  content: { key: 'character-1', dataUrl: characterImage }
});
const savedEnvironmentImage = await window.AICS_SESSION_RESULTS.create({
  sessionId: storySession.id,
  type: 'story_image',
  content: { key: 'scene-1', dataUrl: environmentImage }
});
assert.equal(savedCharacterImage.ownerId, 'user-a');
assert.equal(savedEnvironmentImage.sessionId, storySession.id);

const reopenedSession = await window.AICS_SESSIONS.get(storySession.id);
assert.ok(reopenedSession, 'a saved Story session must be available after reopening');
assert.deepEqual(JSON.parse(JSON.stringify(reopenedSession.draft)), sessionDraft,
  'reopening must restore all saved Story draft data');

const reopenedImages = await window.AICS_SESSION_RESULTS.list({
  sessionId: reopenedSession.id,
  limit: 100
});
assert.equal(reopenedImages.items.length, 2,
  'reopening a Story session must retrieve its saved image cache');
const imageCache = Object.fromEntries(reopenedImages.items.map((item) => [
  item.content.key,
  item.content.dataUrl
]));
assert.equal(imageCache['character-1'], characterImage);
assert.equal(imageCache['scene-1'], environmentImage);

activeToken = makeToken('user-b');
assert.equal(await window.AICS_SESSIONS.get(storySession.id), null,
  'another user must not reopen the Story session');
await assert.rejects(window.AICS_SESSION_RESULTS.list({ sessionId: storySession.id }),
  (error) => error && error.code === 'forbidden');

activeToken = makeToken('user-a');
const updatedDraft = {
  ...sessionDraft,
  fields: { ...sessionDraft.fields, tone: 'mystery' },
  workflow: { ...sessionDraft.workflow, step: 4 }
};
await window.AICS_SESSIONS.update(storySession.id, { draft: updatedDraft });
const afterRefresh = await window.AICS_SESSIONS.get(storySession.id);
assert.equal(afterRefresh.draft.fields.tone, 'mystery',
  'draft edits must survive a refresh/reopen cycle');
assert.equal(afterRefresh.draft.workflow.step, 4);

const stateSource = storyState.STATE_SCRIPT;
const helperSource = storyHelpers.HELPERS_SCRIPT;
const actionSource = storyActions.ACTIONS_SCRIPT;
assert.ok(stateSource && helperSource && actionSource,
  'Story Studio modules must expose their browser script source');

assert.match(actionSource, /window\.studioLoadSession\s*=\s*studioLoadSession/,
  'Story Studio must expose its session restore entry point');
assert.match(actionSource, /window\.AICS_SESSIONS\.create/,
  'first meaningful draft must create an IndexedDB session');
assert.match(actionSource, /window\.AICS_SESSIONS\.update/,
  'draft autosave must update the existing session');
assert.match(actionSource, /window\.AICS_SESSION_RESULTS\.create/,
  'Story images must be persisted as session results');
assert.doesNotMatch(actionSource, /localStorage\.setItem\(['"]aics_draft_story/,
  'Story drafts must no longer be written to LocalStorage');
assert.doesNotMatch(actionSource, /localStorage\.setItem\(['"]aics_draft_story_imgcache/,
  'Story image cache must no longer be written to LocalStorage');
assert.doesNotMatch(helperSource, /localStorage\.getItem\(['"]aics_draft_story_imgcache/,
  'Story image cache must no longer be restored from LocalStorage');

console.log('IndexedDB Story Session persistence and restore tests passed.');
