import type { AppMiddleware, JwtUserPayload } from '../types.js';
import { parseApiKey, verifyApiKey } from '../shared/utils/crypto.js';
import { ApiKeyService } from '../modules/api-keys/api-key.service.js';
import { getKeycloakUserinfo } from '../config/keycloak.js';
import { RoleService } from '../modules/roles/role.service.js';

const apiKeyService = new ApiKeyService();
const roleService = new RoleService();

/**
 * Determines if the bearer token is a JWT (contains dots) or an API key (starts with puc_).
 */
function isJwtToken(token: string): boolean {
  return token.includes('.') && !token.startsWith('puc_');
}

/**
 * Dual authentication middleware.
 * Supports both API Key authentication (for external integrations) and
 * JWT authentication from Keycloak (for the admin web panel).
 */
export function authMiddleware(): AppMiddleware {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.substring(7);

    if (isJwtToken(token)) {
      return await authenticateJwt(token, c, next);
    } else {
      return await authenticateApiKey(token, c, next);
    }
  };
}

/**
 * JWT authentication via OIDC userinfo (Keycloak).
 * Admin users get full permissions automatically.
 */
async function authenticateJwt(token: string, c: any, next: () => Promise<void>) {
  try {
    console.log('Authenticating JWT token:', token); // Debug log

    const userInfo = await getKeycloakUserinfo(token);

    console.log('Keycloak userinfo:', userInfo); // Debug log

    const jwtPayload: JwtUserPayload = {
      sub: String(userInfo.sub),
      email: String(userInfo.email ?? ''),
      preferred_username: String(userInfo.preferred_username ?? userInfo.sub),
      name: userInfo.name ? String(userInfo.name) : undefined,
    };

    // JWT-authenticated admin users get all permissions
    const allPermissions = await roleService.findAllPermissions();

    c.set('apiKey', null);
    c.set('merchant', null);
    c.set('role', null);
    c.set('permissions', allPermissions);
    c.set('authType', 'jwt');
    c.set('jwtPayload', jwtPayload);

    await next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'JWT verification failed';
    return c.json({ error: `Invalid JWT: ${message}` }, 401);
  }
}

/**
 * API Key authentication (original flow).
 */
async function authenticateApiKey(rawKey: string, c: any, next: () => Promise<void>) {
  const parsed = parseApiKey(rawKey);
  if (!parsed) {
    return c.json({ error: 'Invalid API key format' }, 401);
  }

  // Lookup by prefix with relations
  const apiKey = await apiKeyService.findByPrefixWithRelations(parsed.prefix);
  if (!apiKey) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  // Verify hash
  if (!verifyApiKey(rawKey, apiKey.key_hash)) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  // Check active
  if (!apiKey.is_active) {
    return c.json({ error: 'API key is revoked' }, 403);
  }

  // Check expiry
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return c.json({ error: 'API key has expired' }, 403);
  }

  // Check origin
  const origin = c.req.header('Origin');
  const allowedOrigins = apiKey.allowed_origins ?? [];
  if (origin && allowedOrigins.length > 0) {
    if (!allowedOrigins.includes(origin)) {
      return c.json({ error: 'Origin not allowed' }, 403);
    }
  }

  // Check IP whitelist
  const ipWhitelist = apiKey.ip_whitelist ?? [];
  if (ipWhitelist.length > 0) {
    const clientIp = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
      c.req.header('X-Real-IP') ||
      'unknown';
    if (!ipWhitelist.includes(clientIp)) {
      return c.json({ error: 'IP not allowed' }, 403);
    }
  }

  // Merchant check (loaded via relation)
  const merchant = apiKey.merchant;
  if (!merchant || merchant.status !== 'active') {
    return c.json({ error: 'Merchant is not active' }, 403);
  }

  // Update last_used_at
  await apiKeyService.updateLastUsed(apiKey.id);

  // Role & permissions are loaded via eager relation on RoleEntity
  const permissions = apiKey.role?.permissions ?? [];

  // Set auth context
  c.set('apiKey', apiKey);
  c.set('merchant', merchant);
  c.set('role', apiKey.role);
  c.set('permissions', permissions);
  c.set('authType', 'api_key');
  c.set('jwtPayload', null);

  await next();
}

/**
 * Permission check middleware. Use after authMiddleware().
 */
export function requirePermission(resource: string, action: string): AppMiddleware {
  return async (c, next) => {
    const permissions = c.get('permissions') ?? [];
    const has = permissions.some((p) => p.resource === resource && p.action === action);
    if (!has) {
      return c.json({ error: `Forbidden: requires ${resource}:${action}` }, 403);
    }
    await next();
  };
}
