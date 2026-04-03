import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import * as store from '../store/index.js';

/**
 * Audit logging middleware. Records every authenticated request.
 */
export function auditMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    await next();

    const apiKey = c.get('apiKey' as never) as Record<string, unknown> | undefined;
    if (!apiKey) return;

    const log = {
      id: randomUUID(),
      api_key_id: apiKey['id'],
      event_type: `${c.req.method} ${c.req.path}`,
      ip_address:
        c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
        c.req.header('X-Real-IP') ||
        'unknown',
      endpoint: c.req.path,
      http_status: c.res.status,
      created_at: new Date().toISOString(),
    };

    store.create('audit_logs', log);
  };
}
