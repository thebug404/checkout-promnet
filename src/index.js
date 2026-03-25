import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { authMiddleware } from './middleware/auth.js';
import { auditMiddleware } from './middleware/audit.js';

import merchants from './routes/merchants.js';
import apiKeys from './routes/api-keys.js';
import roles from './routes/roles.js';
import pspCredentials from './routes/psp-credentials.js';
import sessions from './routes/sessions.js';
import auditLogs from './routes/audit-logs.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());

// Health check (no auth)
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes — apply auth + audit
const api = new Hono();
api.use('*', authMiddleware());
api.use('*', auditMiddleware());

api.route('/merchants', merchants);
api.route('/api-keys', apiKeys);
api.route('/roles', roles);
api.route('/psp-credentials', pspCredentials);
api.route('/sessions', sessions);
api.route('/audit-logs', auditLogs);

app.route('/v1', api);

// Global error handler
app.onError((err, c) => {
  console.error(`[Error] ${err.message}`);
  if (err instanceof SyntaxError) {
    return c.json({ error: 'Invalid JSON in request body' }, 400);
  }
  return c.json({ error: 'Internal server error' }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

const port = parseInt(process.env.PORT || '3000', 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`\n🚀 PUC API running on http://localhost:${info.port}`);
  console.log(`   Health: http://localhost:${info.port}/health\n`);
});

export default app;
