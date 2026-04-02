import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import * as store from '../store/index.js';
import { requirePermission } from '../middleware/auth.js';
import { generateApiKey, hashApiKey } from '../utils/crypto.js';

const apiKeys = new Hono();

// List API keys for the authenticated merchant (hides hash)
apiKeys.get('/', requirePermission('api_keys', 'read'), (c) => {
  const merchant = c.get('merchant');
  const keys = store.findMany('api_keys', (k) => k.merchant_id === merchant.id);
  const safe = keys.map(({ key_hash, ...rest }) => rest);
  return c.json({ data: safe });
});

// Get a single API key by ID
apiKeys.get('/:id', requirePermission('api_keys', 'read'), (c) => {
  const id = c.req.param('id');
  const merchant = c.get('merchant');
  const key = store.findOne('api_keys', (k) => k.id === id && k.merchant_id === merchant.id);
  if (!key) {
    return c.json({ error: 'API key not found' }, 404);
  }
  const { key_hash, ...safe } = key;
  return c.json({ data: safe });
});

// Create a new API key
apiKeys.post('/', requirePermission('api_keys', 'create'), async (c) => {
  const merchant = c.get('merchant');
  const body = await c.req.json();

  // Validate role exists
  const roleId = body.role_id;
  if (!roleId) {
    return c.json({ error: 'role_id is required' }, 400);
  }
  const role = store.findById('roles', roleId);
  if (!role) {
    return c.json({ error: 'Role not found' }, 404);
  }

  const { raw, prefix } = generateApiKey();
  const keyHash = hashApiKey(raw);

  const apiKey = {
    id: randomUUID(),
    merchant_id: merchant.id,
    role_id: roleId,
    key_prefix: prefix,
    key_hash: keyHash,
    allowed_origins: body.allowed_origins || [],
    ip_whitelist: body.ip_whitelist || [],
    is_active: true,
    expires_at: body.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    last_used_at: null,
    created_at: new Date().toISOString(),
    created_by: body.created_by || 'api',
  };

  store.create('api_keys', apiKey);

  // Return the raw key only once
  const { key_hash, ...safe } = apiKey;
  return c.json({
    data: safe,
    key: raw,
    warning: 'Store this key securely. It cannot be retrieved again.',
  }, 201);
});

// Update API key settings (origins, ip_whitelist, etc.)
apiKeys.patch('/:id', requirePermission('api_keys', 'create'), async (c) => {
  const id = c.req.param('id');
  const merchant = c.get('merchant');
  const body = await c.req.json();

  const existing = store.findOne('api_keys', (k) => k.id === id && k.merchant_id === merchant.id);
  if (!existing) {
    return c.json({ error: 'API key not found' }, 404);
  }

  const allowed = ['allowed_origins', 'ip_whitelist', 'expires_at'];
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const updated = store.update('api_keys', id, updates);
  const { key_hash, ...safe } = updated;
  return c.json({ data: safe });
});

// Revoke an API key
apiKeys.post('/:id/revoke', requirePermission('api_keys', 'revoke'), (c) => {
  const id = c.req.param('id');
  const merchant = c.get('merchant');

  const existing = store.findOne('api_keys', (k) => k.id === id && k.merchant_id === merchant.id);
  if (!existing) {
    return c.json({ error: 'API key not found' }, 404);
  }

  store.update('api_keys', id, { is_active: false });
  return c.json({ message: 'API key revoked' });
});

export default apiKeys;
