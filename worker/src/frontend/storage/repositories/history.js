const SCRIPT = String.raw\`function __aicsHistoryString(value) {
  return typeof value === 'string' ? value : '';
}

function __aicsHistoryResultTitle(result, session) {
  var content = result && result.content;
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    var title = content.title || content.name || content.label;
    if (typeof title === 'string' && title.trim()) return title.trim();
  }
  if (typeof content === 'string' && content.trim()) return content.trim().slice(0, 90);
  var sessionTitle = session && typeof session.title === 'string' ? session.title.trim() : '';
  var resultType = String(result && result.type || 'result').trim();
  return sessionTitle ? sessionTitle + ' · ' + resultType : resultType;
}

function __aicsHistoryMatches(item, options) {
  if (options.type && options.type !== 'all' && item.kind !== options.type) return false;
  var query = String(options.search || '').trim().toLowerCase();
  if (!query) return true;
  return [item.title, item.preview, item.studio, item.kind].join(' ').toLowerCase().indexOf(query) !== -1;
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

        var records = { creations: [], ideas: [], sessions: [], results: [], drafts: [] };
        var pending = 5;
        var settled = false;

        function fail(error) {
          if (settled) return;
          settled = true;
          reject(__aicsStorageError('indexeddb_read_failed', error));
        }

        function readAll(storeName, indexName, key, target) {
          var request;
          try {
            request = transaction.objectStore(storeName).index(indexName).getAll(key);
          } catch (error) {
            fail(error);
            return;
          }
          request.onsuccess = function () {
            if (settled) return;
            records[target] = request.result || [];
            pending -= 1;
          };
          request.onerror = function () { fail(request.error); };
        }

        readAll('creations', 'user_id', String(ownerId), 'creations');
        readAll('ideas', 'ownerId', String(ownerId), 'ideas');
        readAll('studio_sessions', 'ownerId', String(ownerId), 'sessions');
        readAll('session_results', 'ownerId', String(ownerId), 'results');
        readAll('drafts', 'ownerId', String(ownerId), 'drafts');

        transaction.oncomplete = function () {
          if (settled) return;
          if (pending !== 0) {
            fail(new Error('incomplete_history_read'));
            return;
          }
          settled = true;

          var sessionById = Object.create(null);
          var sessionsWithResults = Object.create(null);
          records.sessions.forEach(function (session) {
            if (session && String(session.ownerId || '') === String(ownerId)) {
              sessionById[String(session.id)] = session;
            }
          });
          records.results.forEach(function (result) {
            if (result && String(result.ownerId || '') === String(ownerId) && result.sessionId) {
              sessionsWithResults[String(result.sessionId)] = true;
            }
          });

          var items = [];
          records.creations.forEach(function (record) {
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

          records.ideas.forEach(function (record) {
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

          records.results.forEach(function (record) {
            if (!record || String(record.ownerId || '') !== String(ownerId)) return;
            var session = sessionById[String(record.sessionId)] || null;
            items.push({
              id: 'result:' + String(record.id),
              sourceId: String(record.id),
              sessionId: String(record.sessionId || ''),
              kind: 'result',
              studio: session ? __aicsHistoryString(session.studio) : '',
              title: __aicsHistoryResultTitle(record, session),
              preview: typeof record.content === 'string' ? record.content.slice(0, 180) : '',
              createdAt: __aicsHistoryString(record.createdAt),
              updatedAt: __aicsHistoryString(record.createdAt),
              isFavorite: false
            });
          });

          records.sessions.forEach(function (record) {
            if (!record || String(record.ownerId || '') !== String(ownerId)) return;
            if (sessionsWithResults[String(record.id)]) return;
            items.push({
              id: 'session:' + String(record.id),
              sourceId: String(record.id),
              sessionId: String(record.id),
              kind: 'session',
              studio: __aicsHistoryString(record.studio),
              title: __aicsHistoryString(record.title) || 'Untitled Session',
              preview: '',
              createdAt: __aicsHistoryString(record.createdAt),
              updatedAt: __aicsHistoryString(record.updatedAt),
              isFavorite: false
            });
          });

          records.drafts.forEach(function (record) {
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
};\`;

export function historyRepositoryScript() {
  return SCRIPT;
}
