import type { MiddlewareHandler } from 'hono';
import { parseApiKey, verifyApiKey } from '../utils/crypto.js';
import * as store from '../store/index.js';

/**
 * API Key authentication middleware.
 * Validates the API key, checks active/expiry/origin/IP, resolves role & permissions,
 * and injects the auth context into c.set().
 */
export function authMiddleware(): MiddlewareHandler {
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

    // Lookup by prefix
    const apiKey = store.findOne('api_keys', (k: Record<string, unknown>) => k['key_prefix'] === parsed.prefix) as Record<string, unknown> | null;
    if (!apiKey) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    // Verify hash
    if (!verifyApiKey(rawKey, apiKey['key_hash'] as string)) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    // Check active
    if (!apiKey['is_active']) {
      return c.json({ error: 'API key is revoked' }, 403);
    }

    // Check expiry
    if (apiKey['expires_at'] && new Date(apiKey['expires_at'] as string) < new Date()) {
      return c.json({ error: 'API key has expired' }, 403);
    }

    // Check origin
    const origin = c.req.header('Origin');

    console.log('API key origin:', origin);

    const allowedOrigins = (apiKey['allowed_origins'] as string[]) ?? [];
    if (origin && allowedOrigins.length > 0) {
      console.log('Allowed origins:', allowedOrigins);
      if (!allowedOrigins.includes(origin)) {
        return c.json({ error: 'Origin not allowed' }, 403);
      }
    }

    // Check IP whitelist
    const ipWhitelist = (apiKey['ip_whitelist'] as string[]) ?? [];
    if (ipWhitelist.length > 0) {
      const clientIp = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
        c.req.header('X-Real-IP') ||
        'unknown';
      if (!ipWhitelist.includes(clientIp)) {
        return c.json({ error: 'IP not allowed' }, 403);
      }
    }

    // Resolve role & permissions
    const role = store.findById('roles', apiKey['role_id'] as string);
    const rolePermissions = store.findMany('role_permissions', (rp: Record<string, unknown>) => rp['role_id'] === apiKey['role_id']) as Record<string, unknown>[];
    const permissionIds = rolePermissions.map((rp) => rp['permission_id']);
    const permissions = (store.findAll('permissions') as Record<string, unknown>[]).filter((p) => permissionIds.includes(p['id']));

    // Resolve merchant
    const merchant = store.findById('merchants', apiKey['merchant_id'] as string) as Record<string, unknown> | null;
    if (!merchant || merchant['status'] !== 'active') {
      return c.json({ error: 'Merchant is not active' }, 403);
    }

    // Update last_used_at
    store.update('api_keys', apiKey['id'] as string, { last_used_at: new Date().toISOString() });

    // Set auth context
    c.set('apiKey', apiKey as never);
    c.set('merchant', merchant as never);
    c.set('role', role as never);
    c.set('permissions', permissions as never);

    await next();
  };
}

/**
 * Permission check middleware. Use after authMiddleware().
 * @param {string} resource - e.g. 'sessions'
 * @param {string} action - e.g. 'create'
 */
export function requirePermission(resource: string, action: string): MiddlewareHandler {
  return async (c, next) => {
    const permissions = (c.get('permissions' as never) as Record<string, unknown>[] | undefined) ?? [];
    const has = permissions.some((p) => p['resource'] === resource && p['action'] === action);
    if (!has) {
      return c.json({ error: `Forbidden: requires ${resource}:${action}` }, 403);
    }
    await next();
  };
}
