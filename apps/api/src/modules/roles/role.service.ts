import { RoleRepository, PermissionRepository } from './role.repository.js';
import { RoleEntity } from './role.entity.js';
import { PermissionEntity } from './permission.entity.js';

export class RoleService {
  async findAll(): Promise<RoleEntity[]> {
    return RoleRepository.find();
  }

  async findById(id: string): Promise<RoleEntity | null> {
    return RoleRepository.findOneBy({ id });
  }

  async findByName(name: string): Promise<RoleEntity | null> {
    return RoleRepository.findOneBy({ name });
  }

  async findAllPermissions(): Promise<PermissionEntity[]> {
    return PermissionRepository.find();
  }
}
