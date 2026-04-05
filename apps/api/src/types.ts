import type { Context, MiddlewareHandler } from 'hono';
import type { MerchantEntity } from './modules/merchants/merchant.entity.js';
import type { ApiKeyEntity } from './modules/api-keys/api-key.entity.js';
import type { RoleEntity } from './modules/roles/role.entity.js';
import type { PermissionEntity } from './modules/roles/permission.entity.js';

export type AppVariables = {
  apiKey: ApiKeyEntity | null;
  merchant: MerchantEntity | null;
  role: RoleEntity | null;
  permissions: PermissionEntity[];
  authType: 'api_key' | 'jwt';
  jwtPayload: JwtUserPayload | null;
};

export interface JwtUserPayload {
  sub: string;
  email: string;
  preferred_username: string;
  name?: string;
  realm_access?: { roles: string[] };
}

export type AppContext = Context<{ Variables: AppVariables }>;

export type AppMiddleware = MiddlewareHandler<{ Variables: AppVariables }>;
