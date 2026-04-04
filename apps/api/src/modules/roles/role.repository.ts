import { AppDataSource } from '../../database/data-source.js';
import { RoleEntity } from './role.entity.js';
import { PermissionEntity } from './permission.entity.js';

export const RoleRepository = AppDataSource.getRepository(RoleEntity);
export const PermissionRepository = AppDataSource.getRepository(PermissionEntity);
