import type { Context } from 'hono';
import { AuditLogService } from './audit-log.service.js';

const auditLogService = new AuditLogService();

export class AuditLogController {
  static async findAll(c: Context) {
    const merchant = c.get('merchant' as never) as { id: string };

    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

    const { data, total } = await auditLogService.findByMerchant(merchant.id, page, limit);

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
