import 'reflect-metadata';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { AppDataSource } from './database/data-source.js';
import { authMiddleware } from './middleware/auth.js';
import { auditMiddleware } from './middleware/audit.js';

import merchantRoutes from './modules/merchants/merchant.routes.js';
import apiKeyRoutes from './modules/api-keys/api-key.routes.js';
import roleRoutes from './modules/roles/role.routes.js';
import pspCredentialRoutes from './modules/psp-credentials/psp-credential.routes.js';
import sessionRoutes from './modules/sessions/session.routes.js';
import auditLogRoutes from './modules/audit-logs/audit-log.routes.js';

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

api.route('/merchants', merchantRoutes);
api.route('/api-keys', apiKeyRoutes);
api.route('/roles', roleRoutes);
api.route('/psp-credentials', pspCredentialRoutes);
api.route('/sessions', sessionRoutes);
api.route('/audit-logs', auditLogRoutes);

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

// Initialize database then start server
AppDataSource.initialize()
  .then(() => {
    console.log('📦 Database connected successfully');

    serve({ fetch: app.fetch, port }, (info) => {
      console.log(`\n🚀 PUC API running on http://localhost:${info.port}`);
      console.log(`   Health: http://localhost:${info.port}/health\n`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

export default app;
