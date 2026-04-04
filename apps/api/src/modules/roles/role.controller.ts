import type { AppContext } from '../../types.js';
import { RoleService } from './role.service.js';

const roleService = new RoleService();

export class RoleController {
  static async findAll(c: AppContext) {
    const roles = await roleService.findAll();
    return c.json({ data: roles });
  }

  static async findById(c: AppContext) {
    const role = await roleService.findById(c.req.param('id')!);
    if (!role) {
      return c.json({ error: 'Role not found' }, 404);
    }
    return c.json({ data: role });
  }

  static async findAllPermissions(c: AppContext) {
    const permissions = await roleService.findAllPermissions();
    return c.json({ data: permissions });
  }
}
