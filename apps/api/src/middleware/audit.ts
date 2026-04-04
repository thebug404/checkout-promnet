import type { MiddlewareHandler } from 'hono';
import { AuditLogService } from '../modules/audit-logs/audit-log.service.js';

const auditLogService = new AuditLogService();

/**
 * Audit logging middleware. Records every authenticated request.
 */
export function auditMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    await next();

    const apiKey = c.get('apiKey' as never) as { id: string } | undefined;
    if (!apiKey) return;

    await auditLogService.create({
      api_key_id: apiKey.id,
      event_type: `${c.req.method} ${c.req.path}`,
      ip_address:
        c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
        c.req.header('X-Real-IP') ||
        'unknown',
      endpoint: c.req.path,
      http_status: c.res.status,
    });
  };
}
