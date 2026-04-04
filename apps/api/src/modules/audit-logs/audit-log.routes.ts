import { Hono } from 'hono';
import { requirePermission } from '../../middleware/auth.js';
import { AuditLogController } from './audit-log.controller.js';

const auditLogRoutes = new Hono();

auditLogRoutes.get('/', requirePermission('audit_logs', 'read'), AuditLogController.findAll);

export default auditLogRoutes;
