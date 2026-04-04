import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { environments } from '../config/environments.js';

import { MerchantEntity } from '../modules/merchants/merchant.entity.js';
import { RoleEntity } from '../modules/roles/role.entity.js';
import { PermissionEntity } from '../modules/roles/permission.entity.js';
import { ApiKeyEntity } from '../modules/api-keys/api-key.entity.js';
import { PspCredentialEntity } from '../modules/psp-credentials/psp-credential.entity.js';
import { SessionEntity } from '../modules/sessions/session.entity.js';
import { AuditLogEntity } from '../modules/audit-logs/audit-log.entity.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: environments.DB_HOST,
  port: environments.DB_PORT,
  username: environments.DB_USERNAME,
  password: environments.DB_PASSWORD,
  database: environments.DB_NAME,
  synchronize: environments.NODE_ENV === 'development',
  logging: environments.NODE_ENV === 'development',
  entities: [
    MerchantEntity,
    RoleEntity,
    PermissionEntity,
    ApiKeyEntity,
    PspCredentialEntity,
    SessionEntity,
    AuditLogEntity,
  ],
});
