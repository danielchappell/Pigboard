import { validatePageSize, ValidationError, ForbiddenError, ServiceError } from './errors.mjs';
import { collectPages } from './pagination.mjs';
export function createService(repository) {
  return {
    async listRecords({ tenantId, pageSize = 10 }) {
      validatePageSize(pageSize);
      if (typeof tenantId !== 'string' || !tenantId) throw new ValidationError('Tenant required');
      return (await repository.queryTenant({ tenantId, pageSize, cursor: null })).records;
    },
    async adminRecords({ isAdmin, pageSize = 10 }) {
      if (isAdmin !== true) throw new ForbiddenError();
      validatePageSize(pageSize);
      return (await repository.queryAdmin({ pageSize, cursor: null })).records;
    },
    async exportActive({ tenantId, pageSize }) {
      throw new ServiceError('NOT_IMPLEMENTED', 501, 'Export is not implemented');
    },
  };
}
