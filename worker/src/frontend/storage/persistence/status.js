const SCRIPT = String.raw`window.AICS_STORAGE_PERSISTENCE = window.AICS_STORAGE_PERSISTENCE || {};
window.AICS_STORAGE_PERSISTENCE.getStatus = function () {
  var storage;
  try {
    storage = window.navigator && window.navigator.storage;
  } catch (error) {
    storage = null;
  }

  if (!storage) {
    return Promise.resolve({
      supported: false,
      persistSupported: false,
      persisted: null,
      usage: null,
      quota: null
    });
  }

  var result = {
    supported: true,
    persistSupported: typeof storage.persist === 'function',
    persisted: null,
    usage: null,
    quota: null
  };

  var checks = [];
  if (typeof storage.persisted === 'function') {
    checks.push(Promise.resolve().then(function () {
      return storage.persisted();
    }).then(function (value) {
      result.persisted = value === true;
    }).catch(function () {}));
  }
  if (typeof storage.estimate === 'function') {
    checks.push(Promise.resolve().then(function () {
      return storage.estimate();
    }).then(function (estimate) {
      if (!estimate || typeof estimate !== 'object') return;
      result.usage = Number.isFinite(estimate.usage) && estimate.usage >= 0
        ? estimate.usage : null;
      result.quota = Number.isFinite(estimate.quota) && estimate.quota >= 0
        ? estimate.quota : null;
    }).catch(function () {}));
  }

  return Promise.all(checks).then(function () { return result; });
};`;

export function storageStatusScript() {
  return SCRIPT;
}
