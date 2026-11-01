const SCRIPT = String.raw`function __aicsStorageError(code, cause) {
  var error = new Error(code);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}`;

export function storageErrorsScript() {
  return SCRIPT;
}
