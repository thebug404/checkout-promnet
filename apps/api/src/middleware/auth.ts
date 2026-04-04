import type { AppMiddleware } from '../types.js';
import { parseApiKey, verifyApiKey } from '../shared/utils/crypto.js';
import { ApiKeyService } from '../modules/api-keys/api-key.service.js';

const apiKeyService = new ApiKeyService();

/**
 * API Key authentication middleware.
 * Validates the API key, checks active/expiry/origin/IP, resolves role & permissions,
 * and injects the auth context into c.set().
 */
export function authMiddleware(): AppMiddleware {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const rawKey = authHeader.substring(7);
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
    console.log('API key origin:', origin);

    const allowedOrigins = apiKey.allowed_origins ?? [];
    if (origin && allowedOrigins.length > 0) {
      console.log('Allowed origins:', allowedOrigins);
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

    await next();
  };
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
