const SCRIPT = String.raw`(function () {
  var STUDIOS = ['content', 'short', 'image', 'voice', 'shop'];

  function studioName(value) {
    var name = String(value || '').trim().toLowerCase();
    if (STUDIOS.indexOf(name) === -1) throw __aicsStorageError('invalid_draft_studio');
    return name;
  }

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function safeDraftData(studio, value) {
    if (!isRecord(value)) throw __aicsStorageError('invalid_draft_data');
    // BYOK credentials are runtime secrets, never part of a persisted user draft.
    if (!isRecord(value.data)) throw __aicsStorageError('invalid_draft_data');
    var data = value.data;
    if (studio === 'content') {
      delete data.byok;
      delete data.videoByok;
    }
    return value;
  }

  function envelope(value) {
    if (!isRecord(value)) throw __aicsStorageError('invalid_draft_envelope');
    var step = Number(value.step);
    if (!isFinite(step) || step < 1) step = 1;
    if (!isRecord(value.data)) throw __aicsStorageError('invalid_draft_data');
    return {
      step: Math.floor(step),
      data: value.data,
      savedAt: typeof value.savedAt === 'string' ? value.savedAt : new Date().toISOString()
    };
  }

  window.AICS_STUDIO_DRAFTS = {
    studios: STUDIOS.slice(),

    save: function (studioValue, draftValue) {
      var studio;
      var draft;
      try {
        studio = studioName(studioValue);
        draft = envelope(draftValue);
        safeDraftData(studio, draft);
      } catch (error) { return Promise.reject(error); }
      return window.AICS_DRAFTS.save({
        studio: studio,
        draftVersion: 1,
        data: draft
      });
    },

    load: function (studioValue) {
      var studio;
      try { studio = studioName(studioValue); }
      catch (error) { return Promise.reject(error); }
      return window.AICS_DRAFTS.get(studio).then(function (record) {
        if (!record || !record.data) return null;
        return {
          studio: studio,
          draftVersion: Number(record.draftVersion) || 1,
          data: envelope(record.data),
          updatedAt: record.updatedAt || ''
        };
      });
    },

    remove: function (studioValue) {
      var studio;
      try { studio = studioName(studioValue); }
      catch (error) { return Promise.reject(error); }
      return window.AICS_DRAFTS.remove(studio);
    },

    importLegacy: function (studioValue, legacyValue) {
      var studio;
      var legacy;
      try {
        studio = studioName(studioValue);
        legacy = envelope(legacyValue);
        safeDraftData(studio, legacy);
      } catch (error) { return Promise.reject(error); }

      // Never overwrite a newer IndexedDB draft. Legacy source remains untouched.
      return window.AICS_DRAFTS.get(studio).then(function (existing) {
        if (existing && existing.data) {
          return { imported: false, reason: 'indexeddb_draft_exists', record: existing };
        }
        return window.AICS_DRAFTS.save({
          studio: studio,
          draftVersion: 1,
          data: legacy
        }).then(function (record) {
          return { imported: true, reason: 'legacy_draft_imported', record: record };
        });
      });
    }
  };
})();`;

export function studioDraftsAdapterScript() {
  return SCRIPT;
}
