import { Hono } from 'hono';
import * as store from '../store/index.js';
import { requirePermission } from '../middleware/auth.js';

const roles = new Hono();

// List all roles
roles.get('/', requirePermission('merchants', 'read'), (c) => {
  const all = store.findAll('roles');
  return c.json({ data: all });
});

// Get role with its permissions
roles.get('/:id', requirePermission('merchants', 'read'), (c) => {
  const id = c.req.param('id');
  const role = store.findById('roles', id);
  if (!role) {
    return c.json({ error: 'Role not found' }, 404);
  }

  const rolePermissions = store.findMany('role_permissions', (rp: Record<string, unknown>) => rp['role_id'] === id) as Record<string, unknown>[];
  const permissionIds = rolePermissions.map((rp) => rp['permission_id']);
  const permissions = (store.findAll('permissions') as Record<string, unknown>[]).filter((p) => permissionIds.includes(p['id']));

  return c.json({ data: { ...role, permissions } });
});

// List all permissions
roles.get('/permissions/all', requirePermission('merchants', 'read'), (c) => {
  const all = store.findAll('permissions');
  return c.json({ data: all });
});

export default roles;
