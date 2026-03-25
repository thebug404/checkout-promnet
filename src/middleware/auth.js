import { parseApiKey, verifyApiKey } from '../utils/crypto.js';
import * as store from '../store/index.js';

/**
 * API Key authentication middleware.
 * Validates the API key, checks active/expiry/origin/IP, resolves role & permissions,
 * and injects the auth context into c.set().
 */
export function authMiddleware() {
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
    const apiKey = store.findOne('api_keys', (k) => k.key_prefix === parsed.prefix);
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

    if (origin && apiKey.allowed_origins.length > 0) {
      console.log('Allowed origins:', apiKey.allowed_origins);
      if (!apiKey.allowed_origins.includes(origin)) {
      // if (apiKey.allowed_origins.includes(origin)) {
        return c.json({ error: 'Origin not allowed' }, 403);
      }
    }

    // Check IP whitelist
    if (apiKey.ip_whitelist && apiKey.ip_whitelist.length > 0) {
      const clientIp = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
        c.req.header('X-Real-IP') ||
        'unknown';
      if (!apiKey.ip_whitelist.includes(clientIp)) {
        return c.json({ error: 'IP not allowed' }, 403);
      }
    }

    // Resolve role & permissions
    const role = store.findById('roles', apiKey.role_id);
    const rolePermissions = store.findMany('role_permissions', (rp) => rp.role_id === apiKey.role_id);
    const permissionIds = rolePermissions.map((rp) => rp.permission_id);
    const permissions = store.findAll('permissions').filter((p) => permissionIds.includes(p.id));

    // Resolve merchant
    const merchant = store.findById('merchants', apiKey.merchant_id);
    if (!merchant || merchant.status !== 'active') {
      return c.json({ error: 'Merchant is not active' }, 403);
    }

    // Update last_used_at
    store.update('api_keys', apiKey.id, { last_used_at: new Date().toISOString() });

    // Set auth context
    c.set('apiKey', apiKey);
    c.set('merchant', merchant);
    c.set('role', role);
    c.set('permissions', permissions);

    await next();
  };
}

/**
 * Permission check middleware. Use after authMiddleware().
 * @param {string} resource - e.g. 'sessions'
 * @param {string} action - e.g. 'create'
 */
export function requirePermission(resource, action) {
  return async (c, next) => {
    const permissions = c.get('permissions') || [];
    const has = permissions.some((p) => p.resource === resource && p.action === action);
    if (!has) {
      return c.json({ error: `Forbidden: requires ${resource}:${action}` }, 403);
    }
    await next();
  };
}
