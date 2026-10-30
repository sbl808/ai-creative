const STATUS_CODES = Object.freeze({400:['invalid_request',false],401:['authentication_failed',false],403:['permission_denied',false],404:['model_not_found',false],429:['rate_limited',true]});
export class AIServiceError extends Error {
  constructor(code,message=code,context={}) {
    super(message); this.name='AIServiceError'; this.code=code;
    this.provider=context.provider||null; this.operation=context.operation||null; this.model=context.model||null;
    this.status=Number.isFinite(context.status)?context.status:null; this.retryable=!!context.retryable;
    this.retryAfterMs=Number.isFinite(context.retryAfterMs)?context.retryAfterMs:null;
    if(context.noRetry)this.noRetry=true;
  }
}
export function mapProviderHttpError(status,providerError=null,retryAfterMs=null) {
  const payload=providerError?.error||providerError;
  const detail=String(payload?.status||payload?.reason||payload?.message||'').toLowerCase();
  let code,retryable=false;
  if((status===403||status===429)&&/quota|resource_exhausted|billing/.test(detail)){code='quota_exceeded';retryable=status===429;}
  else if(STATUS_CODES[status])[code,retryable]=STATUS_CODES[status];
  else if(status>=500){code='provider_unavailable';retryable=true;}
  else code='provider_error';
  return new AIServiceError(code,code,{provider:'gemini',status,retryable,retryAfterMs});
}
export function normalizeAIError(error,context={}) {
  if(error instanceof AIServiceError)return error;
  const message=String(error?.message||'').toLowerCase();
  let code='provider_error',retryable=false;
  if(error?.name==='AbortError'||error?.name==='TimeoutError'||/network|fetch failed|connection reset|timed out|timeout/.test(message)){code='network_error';retryable=!error?.noRetry;}
  else if(/no_api_key|missing_api_key/.test(message))code='missing_api_key';
  else if(/prompt_too_large|invalid_images|invalid_image|too_many_images|image_too_large|images_too_large/.test(message))code='invalid_request';
  else if(/no_image|no_audio|bad_response|invalid_provider_response/.test(message))code='invalid_provider_response';
  return new AIServiceError(code,code,{...context,retryable,noRetry:error?.noRetry});
}
export function getAIErrorHttpStatus(error) {
  const code=error?.code||'provider_error';
  if(code==='authentication_failed')return 401;
  if(code==='permission_denied')return 403;
  if(code==='rate_limited'||code==='quota_exceeded')return 429;
  if(code==='model_not_found')return 404;
  if(['invalid_request','missing_api_key','model_required','task_not_supported','capability_not_supported','operation_not_supported'].includes(code))return 400;
  if(code==='model_deprecated'||code==='model_unavailable')return 409;
  if(code==='network_error'||code==='provider_unavailable')return 503;
  return 502;
}
