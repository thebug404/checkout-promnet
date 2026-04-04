import { Hono } from 'hono';
import type { AppVariables } from '../../types.js';
import { requirePermission } from '../../middleware/auth.js';
import { MerchantController } from './merchant.controller.js';

const merchantRoutes = new Hono<{ Variables: AppVariables }>();

merchantRoutes.get('/', requirePermission('merchants', 'read'), MerchantController.findAll);
merchantRoutes.get('/:id', requirePermission('merchants', 'read'), MerchantController.findById);
merchantRoutes.post('/', requirePermission('merchants', 'create'), MerchantController.create);
merchantRoutes.patch('/:id', requirePermission('merchants', 'update'), MerchantController.update);
merchantRoutes.delete('/:id', requirePermission('merchants', 'delete'), MerchantController.delete);

export default merchantRoutes;
