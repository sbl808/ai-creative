const SCRIPT = [
  "window.AICS_BACKUP_IMPORT = (function () {",
  "  function validateText(text) {",
  "    var ownerId;",
  "    try { ownerId = __aicsRequireUserId(); }",
  "    catch (error) { return Promise.reject(error); }",
  "    try { return Promise.resolve(window.__AICS_VALIDATE_BACKUP.validateText(text, ownerId)); }",
  "    catch (error) { return Promise.reject(error); }",
  "  }",
  "  function validateFile(file) {",
  "    var ownerId;",
  "    try { ownerId = __aicsRequireUserId(); }",
  "    catch (error) { return Promise.reject(error); }",
  "    if (!file || typeof file.size !== 'number' || file.size < 0 ||",
  "        file.size > window.__AICS_VALIDATE_BACKUP.maxBytes) {",
  "      return Promise.reject(__aicsStorageError('backup_file_too_large'));",
  "    }",
  "    if (typeof file.text !== 'function') {",
  "      return Promise.reject(__aicsStorageError('backup_file_unreadable'));",
  "    }",
  "    return Promise.resolve().then(function () { return file.text(); }).then(function (text) {",
  "      return window.__AICS_VALIDATE_BACKUP.validateText(text, ownerId);",
  "    }).catch(function (error) {",
  "      if (error && error.code) throw error;",
  "      throw __aicsStorageError('backup_file_read_failed');",
  "    });",
  "  }",
  "  return { validateText: validateText, validateFile: validateFile };",
  "})();"
].join('\n');

export function backupImportScript() {
  return SCRIPT;
}
