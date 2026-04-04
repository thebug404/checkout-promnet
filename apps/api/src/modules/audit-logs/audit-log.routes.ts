import { Hono } from 'hono';
import type { AppVariables } from '../../types.js';
import { requirePermission } from '../../middleware/auth.js';
import { AuditLogController } from './audit-log.controller.js';

const auditLogRoutes = new Hono<{ Variables: AppVariables }>();

auditLogRoutes.get('/', requirePermission('audit_logs', 'read'), AuditLogController.findAll);

export default auditLogRoutes;
