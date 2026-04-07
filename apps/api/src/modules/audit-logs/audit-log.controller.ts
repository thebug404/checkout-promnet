import type { AppContext } from '../../types.js';
import { AuditLogService } from './audit-log.service.js';

const auditLogService = new AuditLogService();

export class AuditLogController {
  static async findAll(c: AppContext) {
    const merchantId = c.req.param('merchantId')!;

    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

    const { data, total } = await auditLogService.findByMerchant(merchantId, page, limit);

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
