import type { Context } from 'hono';
import { RoleService } from './role.service.js';

const roleService = new RoleService();

export class RoleController {
  static async findAll(c: Context) {
    const roles = await roleService.findAll();
    return c.json({ data: roles });
  }

  static async findById(c: Context) {
    const role = await roleService.findById(c.req.param('id')!);
    if (!role) {
      return c.json({ error: 'Role not found' }, 404);
    }
    return c.json({ data: role });
  }

  static async findAllPermissions(c: Context) {
    const permissions = await roleService.findAllPermissions();
    return c.json({ data: permissions });
  }
}
