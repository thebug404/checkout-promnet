import { Hono } from 'hono';
import type { AppVariables } from '../../types.js';
import { requirePermission } from '../../middleware/auth.js';
import { RoleController } from './role.controller.js';

const roleRoutes = new Hono<{ Variables: AppVariables }>();

roleRoutes.get('/', requirePermission('merchants', 'read'), RoleController.findAll);
roleRoutes.get('/permissions/all', requirePermission('merchants', 'read'), RoleController.findAllPermissions);
roleRoutes.get('/:id', requirePermission('merchants', 'read'), RoleController.findById);

export default roleRoutes;
