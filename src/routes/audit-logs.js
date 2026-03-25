import { Hono } from 'hono';
import * as store from '../store/index.js';
import { requirePermission } from '../middleware/auth.js';

const auditLogs = new Hono();

// List audit logs for the authenticated API key's merchant
auditLogs.get('/', requirePermission('audit_logs', 'read'), (c) => {
  const merchant = c.get('merchant');

  // Get all api_keys for this merchant
  const merchantKeys = store.findMany('api_keys', (k) => k.merchant_id === merchant.id);
  const keyIds = merchantKeys.map((k) => k.id);

  // Get logs for those keys
  const logs = store.findMany('audit_logs', (log) => keyIds.includes(log.api_key_id));

  // Sort by created_at desc
  logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Pagination
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const start = (page - 1) * limit;
  const paginated = logs.slice(start, start + limit);

  return c.json({
    data: paginated,
    meta: {
      total: logs.length,
      page,
      limit,
      pages: Math.ceil(logs.length / limit),
    },
  });
});

export default auditLogs;
