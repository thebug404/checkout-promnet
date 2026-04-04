import type { Context, MiddlewareHandler } from 'hono';
import type { MerchantEntity } from './modules/merchants/merchant.entity.js';
import type { ApiKeyEntity } from './modules/api-keys/api-key.entity.js';
import type { RoleEntity } from './modules/roles/role.entity.js';
import type { PermissionEntity } from './modules/roles/permission.entity.js';

export type AppVariables = {
  apiKey: ApiKeyEntity;
  merchant: MerchantEntity;
  role: RoleEntity;
  permissions: PermissionEntity[];
};

export type AppContext = Context<{ Variables: AppVariables }>;

export type AppMiddleware = MiddlewareHandler<{ Variables: AppVariables }>;
