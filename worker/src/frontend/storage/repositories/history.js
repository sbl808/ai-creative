const SCRIPT = String.raw`function __aicsHistoryString(value) {
  return typeof value === 'string' ? value : '';
}

function __aicsHistoryMatches(item, options) {
  if (options.type && options.type !== 'all' && item.kind !== options.type) return false;
  var query = String(options.search || '').trim().toLowerCase();
  if (!query) return true;
  return [item.title, item.preview, item.studio, item.kind]
    .join(' ')
    .toLowerCase()
    .indexOf(query) !== -1;
}

function __aicsHistoryResultFields(record) {
  var content = record && record.content;
  var title = '';
  var preview = '';
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    var candidate = content.title || content.name || content.label;
    if (typeof candidate === 'string') title = candidate.trim();
  } else if (typeof content === 'string') {
    preview = content.slice(0, 180);
  }
  return { title: title, preview: preview };
}

window.AICS_HISTORY = {
  list: function (options) {
    var ownerId = __aicsUserId();
    if (!ownerId) return Promise.resolve([]);
    options = options || {};

    return __aicsDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try {
          transaction = db.transaction(
            ['creations', 'ideas', 'studio_sessions', 'session_results', 'drafts'],
            'readonly'
          );
        } catch (error) {
          reject(__aicsStorageError('indexeddb_transaction_failed', error));
          return;
        }

        var items = [];
        var sessionsById = Object.create(null);
        var sessionsWithResults = Object.create(null);
        var sessionItems = [];
        var resultItems = [];
        var settled = false;

        function fail(error) {
          if (settled) return;
          settled = true;
          try { transaction.abort(); } catch (abortError) {}
          reject(__aicsStorageError('indexeddb_read_failed', error));
        }

        function scanStore(storeName, indexName, key, onRecord) {
          var request;
          try {
            request = transaction.objectStore(storeName).index(indexName)
              .openCursor(window.IDBKeyRange.only(key));
          } catch (error) {
            fail(error);
            return;
          }
          request.onerror = function () { fail(request.error); };
          request.onsuccess = function () {
            if (settled) return;
            var cursor = request.result;
            if (!cursor) return;
            try { onRecord(cursor.value); }
            catch (error) { fail(error); return; }
            try { cursor.continue(); }
            catch (error) { fail(error); }
          };
        }

        scanStore('creations', 'user_id', String(ownerId), function (record) {
          if (!record || String(record.user_id || '') !== String(ownerId)) return;
          items.push({
            id: 'creation:' + String(record.id),
            sourceId: String(record.id),
            kind: 'creation',
            studio: __aicsHistoryString(record.studio),
            title: __aicsHistoryString(record.title) || 'Untitled',
            preview: __aicsHistoryString(record.original_prompt),
            createdAt: __aicsHistoryString(record.created_at),
            updatedAt: __aicsHistoryString(record.updated_at),
            isFavorite: record.is_favorite === 1 || record.is_favorite === true
          });
        });

        scanStore('ideas', 'ownerId', String(ownerId), function (record) {
          if (!record || String(record.ownerId || '') !== String(ownerId)) return;
          var result = record.result && typeof record.result === 'object' ? record.result : {};
          items.push({
            id: 'idea:' + String(record.id),
            sourceId: String(record.id),
            kind: 'idea',
            studio: __aicsHistoryString(record.category),
            title: __aicsHistoryString(result.title) || 'Untitled Idea',
            preview: __aicsHistoryString(result.concept || result.hook),
            createdAt: __aicsHistoryString(record.createdAt),
            updatedAt: __aicsHistoryString(record.updatedAt),
            isFavorite: record.isFavorite === true
          });
        });

        scanStore('studio_sessions', 'ownerId', String(ownerId), function (record) {
          if (!record || String(record.ownerId || '') !== String(ownerId)) return;
          var id = String(record.id);
          sessionsById[id] = {
            studio: __aicsHistoryString(record.studio),
            title: __aicsHistoryString(record.title) || 'Untitled Session'
          };
          sessionItems.push({
            id: 'session:' + id,
            sourceId: id,
            sessionId: id,
            kind: 'session',
            studio: __aicsHistoryString(record.studio),
            title: __aicsHistoryString(record.title) || 'Untitled Session',
            preview: '',
            createdAt: __aicsHistoryString(record.createdAt),
            updatedAt: __aicsHistoryString(record.updatedAt),
            isFavorite: false
          });
          sessionItems.push({
            id: 'session:' + id,
            sourceId: id,
            sessionId: id,
            kind: 'session',
            studio: __aicsHistoryString(record.studio),
            title: __aicsHistoryString(record.title) || 'Untitled Session',
            preview: '',
            createdAt: __aicsHistoryString(record.createdAt),
            updatedAt: __aicsHistoryString(record.updatedAt),
            isFavorite: false
          });
        });

        scanStore('session_results', 'ownerId', String(ownerId), function (record) {
          if (!record || String(record.ownerId || '') !== String(ownerId)) return;
          var fields = __aicsHistoryResultFields(record);
          var sessionId = String(record.sessionId || '');
          if (sessionId) sessionsWithResults[sessionId] = true;
          resultItems.push({
            id: 'result:' + String(record.id),
            sourceId: String(record.id),
            sessionId: sessionId,
            kind: 'result',
            title: fields.title,
            preview: fields.preview,
            resultType: __aicsHistoryString(record.type) || 'result',
            createdAt: __aicsHistoryString(record.createdAt),
            updatedAt: __aicsHistoryString(record.createdAt)
          });
        });

        scanStore('drafts', 'ownerId', String(ownerId), function (record) {
          if (!record || String(record.ownerId || '') !== String(ownerId)) return;
          var studio = __aicsHistoryString(record.studio);
          items.push({
            id: 'draft:' + String(record.id),
            sourceId: String(record.id),
            kind: 'draft',
            studio: studio,
            title: studio ? studio.charAt(0).toUpperCase() + studio.slice(1) + ' Draft' : 'Draft',
            preview: '',
            createdAt: __aicsHistoryString(record.createdAt || record.updatedAt),
            updatedAt: __aicsHistoryString(record.updatedAt),
            isFavorite: false
          });
        });

        transaction.oncomplete = function () {
          if (settled) return;
          settled = true;
          resultItems.forEach(function (item) {
            var session = sessionsById[item.sessionId] || null;
            item.studio = session ? session.studio : '';
            if (!item.title) {
              item.title = session ? session.title + ' · ' + item.resultType : item.resultType;
            }
            delete item.resultType;
            item.isFavorite = false;
            items.push(item);
          });
          sessionItems.forEach(function (item) {
            if (!sessionsWithResults[item.sessionId]) items.push(item);
          });
          items = items.filter(function (item) { return __aicsHistoryMatches(item, options); });
          items.sort(function (a, b) {
            var aDate = a.updatedAt || a.createdAt || '';
            var bDate = b.updatedAt || b.createdAt || '';
            var dateOrder = bDate.localeCompare(aDate);
            return dateOrder || a.id.localeCompare(b.id);
          });
          resolve(items);
        };
        transaction.onerror = function () {
          fail(transaction.error || new Error('indexeddb_transaction_failed'));
        };
        transaction.onabort = function () {
          fail(transaction.error || new Error('indexeddb_transaction_aborted'));
        };
      });
    });
  }
};`;

export function historyRepositoryScript() {
  return SCRIPT;
}
