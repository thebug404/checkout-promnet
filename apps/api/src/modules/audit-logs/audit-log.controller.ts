import type { AppContext } from '../../types.js';
import { AuditLogService } from './audit-log.service.js';

const auditLogService = new AuditLogService();

export class AuditLogController {
  static async findAll(c: AppContext) {
    const merchant = c.get('merchant');

    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

    const { data, total } = merchant
      ? await auditLogService.findByMerchant(merchant.id, page, limit)
      : await auditLogService.findAll(page, limit);

    return c.json({
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }
}
