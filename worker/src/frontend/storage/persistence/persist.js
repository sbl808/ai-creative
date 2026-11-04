const SCRIPT = String.raw`window.AICS_STORAGE_PERSISTENCE = window.AICS_STORAGE_PERSISTENCE || {};
window.AICS_STORAGE_PERSISTENCE.requestPersistence = function () {
  var storage;
  try {
    storage = window.navigator && window.navigator.storage;
  } catch (error) {
    storage = null;
  }

  if (!storage || typeof storage.persist !== 'function') {
    return Promise.resolve({
      supported: false,
      granted: false,
      persisted: null,
      error: 'persistence_unsupported'
    });
  }

  return Promise.resolve().then(function () {
    if (typeof storage.persisted === 'function') {
      return storage.persisted();
    }
    return false;
  }).catch(function () {
    return false;
  }).then(function (alreadyPersisted) {
    if (alreadyPersisted === true) {
      return {
        supported: true,
        granted: true,
        persisted: true,
        alreadyPersisted: true
      };
    }
    return Promise.resolve().then(function () {
      return storage.persist();
    }).then(function (granted) {
      return {
        supported: true,
        granted: granted === true,
        persisted: granted === true,
        alreadyPersisted: false
      };
    }).catch(function () {
      return {
        supported: true,
        granted: false,
        persisted: false,
        error: 'persistence_request_failed'
      };
    });
  });
};`;

export function storagePersistScript() {
  return SCRIPT;
}
