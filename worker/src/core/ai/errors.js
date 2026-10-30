export class AIServiceError extends Error {
  constructor(code, message = code, context = {}) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.provider = context.provider || null;
    this.operation = context.operation || null;
    this.model = context.model || null;
    this.retryable = !!context.retryable;
  }
}
export function normalizeAIError(error, context = {}) {
  if (error instanceof AIServiceError) return error;
  const message = String(error?.message || 'ai_provider_error');
  const normalized = new AIServiceError('provider_error', message, context);
  normalized.cause = error;
  if (error?.noRetry) normalized.noRetry = true;
  return normalized;
}
