import { Hono } from 'hono';
import { requirePermission } from '../../middleware/auth.js';
import { SessionController } from './session.controller.js';

const sessionRoutes = new Hono();

sessionRoutes.post('/', requirePermission('sessions', 'create'), SessionController.create);
sessionRoutes.get('/', requirePermission('sessions', 'read'), SessionController.findAll);
sessionRoutes.get('/:id', requirePermission('sessions', 'read'), SessionController.findById);
sessionRoutes.post('/:id/payment', requirePermission('sessions', 'create'), SessionController.processPayment);
sessionRoutes.post('/:id/complete', requirePermission('sessions', 'create'), SessionController.complete);

export default sessionRoutes;
