const SCRIPT = String.raw`(function () {
  var accountToken = '';
  var accountPromise = null;
  var passphrase = '';

  function currentToken() {
    try { return String(localStorage.getItem('aics_token') || ''); }
    catch (error) { return ''; }
  }

  function getAccountId() {
    var token = currentToken();
    if (!token) return Promise.reject(new Error('credentials_login_required'));
    if (token !== accountToken) {
      accountToken = token;
      accountPromise = null;
      passphrase = '';
    }
    if (!accountPromise) {
      accountPromise = fetch('/api/users/me', {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Authorization': 'Bearer ' + token }
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data || data.error || data.user_id === undefined || data.user_id === null) {
            throw new Error('credentials_account_unavailable');
          }
          return String(data.user_id);
        });
      }).catch(function (error) {
        accountPromise = null;
        throw error;
      });
    }
    return accountPromise;
  }

  function askPassphrase(confirmValue) {
    var value = window.prompt(confirmValue
      ? 'API Key စာဝှက်ရန် Passphrase အသစ်ကို ထပ်မံထည့်ပါ။'
      : 'သင့် API Key ကို ဖွင့်ရန် Passphrase ထည့်ပါ။');
    if (value === null) throw new Error('credentials_passphrase_cancelled');
    if (!value) throw new Error('credentials_passphrase_required');
    return value;
  }

  function hasGemini() {
    return getAccountId().then(function (accountId) {
      return window.AICS_API_KEYS.list(accountId).then(function (records) {
        return (records || []).some(function (record) {
          return record && record.provider === 'gemini';
        });
      });
    });
  }

  function saveGemini(apiKey) {
    var key = String(apiKey || '').trim();
    if (!key) return Promise.reject(new Error('credentials_api_key_required'));
    return getAccountId().then(function (accountId) {
      var first = askPassphrase(false);
      var second = askPassphrase(true);
      if (first !== second) throw new Error('credentials_passphrase_mismatch');
      return window.AICS_API_KEYS.save(accountId, 'gemini', key, first).then(function (result) {
        passphrase = first;
        key = '';
        return result;
      });
    });
  }

  function getGemini() {
    return getAccountId().then(function (accountId) {
      return window.AICS_API_KEYS.list(accountId).then(function (records) {
        var exists = (records || []).some(function (record) {
          return record && record.provider === 'gemini';
        });
        if (!exists) throw new Error('credentials_not_found');
        if (!passphrase) passphrase = askPassphrase(false);
        return window.AICS_API_KEYS.decrypt(accountId, 'gemini', passphrase).catch(function (error) {
          passphrase = '';
          throw error;
        });
      });
    });
  }

  function withGeminiKey(body) {
    return getGemini().then(function (apiKey) {
      var requestBody = Object.assign({}, body || {});
      requestBody.apiKey = apiKey;
      return requestBody;
    });
  }

  function removeGemini() {
    return getAccountId().then(function (accountId) {
      passphrase = '';
      return window.AICS_API_KEYS.remove(accountId, 'gemini');
    });
  }

  window.AICS_BYOK = {
    hasGemini: hasGemini,
    saveGemini: saveGemini,
    getGemini: getGemini,
    withGeminiKey: withGeminiKey,
    removeGemini: removeGemini
  };
})();`;

export function byokRuntimeScript() {
  return SCRIPT;
}
