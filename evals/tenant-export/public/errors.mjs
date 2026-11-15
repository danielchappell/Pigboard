export class ServiceError extends Error {
  constructor(code, status, message) { super(message); this.code = code; this.status = status; }
}
export class ValidationError extends ServiceError {
  constructor(message = 'Invalid page size') { super('VALIDATION', 400, message); }
}
export class UnauthorizedError extends ServiceError {
  constructor() { super('UNAUTHORIZED', 401, 'Sign in first'); }
}
export class ForbiddenError extends ServiceError {
  constructor() { super('FORBIDDEN', 403, 'Administrator required'); }
}
export class UpstreamError extends ServiceError {
  constructor(message = 'Data source unavailable') { super('UPSTREAM', 502, message); }
}
export function validatePageSize(pageSize) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new ValidationError();
  return pageSize;
}
