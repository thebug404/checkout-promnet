import { Hono } from 'hono';
import { requirePermission } from '../../middleware/auth.js';
import { RoleController } from './role.controller.js';

const roleRoutes = new Hono();

roleRoutes.get('/', requirePermission('merchants', 'read'), RoleController.findAll);
roleRoutes.get('/permissions/all', requirePermission('merchants', 'read'), RoleController.findAllPermissions);
roleRoutes.get('/:id', requirePermission('merchants', 'read'), RoleController.findById);

export default roleRoutes;
