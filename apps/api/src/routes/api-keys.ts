import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import * as store from '../store/index.js';
import { requirePermission } from '../middleware/auth.js';
import { generateApiKey, hashApiKey } from '../utils/crypto.js';
import { validateDto } from '../utils/validate.js';
import { CreateApiKeyDto, UpdateApiKeyDto } from '../dtos/api-key.dto.js';

const apiKeys = new Hono();

// List API keys for the authenticated merchant (hides hash)
apiKeys.get('/', requirePermission('api_keys', 'read'), (c) => {
  const merchant = c.get('merchant' as never) as Record<string, unknown>;
  const keys = store.findMany('api_keys', (k: Record<string, unknown>) => k['merchant_id'] === merchant['id']) as Record<string, unknown>[];
  const safe = keys.map(({ key_hash: _kh, ...rest }) => rest);
  return c.json({ data: safe });
});

// Get a single API key by ID
apiKeys.get('/:id', requirePermission('api_keys', 'read'), (c) => {
  const id = c.req.param('id');
  const merchant = c.get('merchant' as never) as Record<string, unknown>;
  const key = store.findOne('api_keys', (k: Record<string, unknown>) => k['id'] === id && k['merchant_id'] === merchant['id']) as Record<string, unknown> | null;
  if (!key) {
    return c.json({ error: 'API key not found' }, 404);
  }
  const { key_hash: _kh, ...safe } = key;
  return c.json({ data: safe });
});

// Create a new API key
apiKeys.post('/', requirePermission('api_keys', 'create'), async (c) => {
  const merchant = c.get('merchant' as never) as Record<string, unknown>;
  const body = await c.req.json();

  const errors = await validateDto(CreateApiKeyDto, body);
  if (errors) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  const dto = body as CreateApiKeyDto;

  const role = store.findById('roles', dto.role_id);
  if (!role) {
    return c.json({ error: 'Role not found' }, 404);
  }

  const { raw, prefix } = generateApiKey();
  const keyHash = hashApiKey(raw);

  const apiKey = {
    id: randomUUID(),
    merchant_id: merchant['id'],
    role_id: dto.role_id,
    key_prefix: prefix,
    key_hash: keyHash,
    allowed_origins: dto.allowed_origins ?? [],
    ip_whitelist: dto.ip_whitelist ?? [],
    is_active: true,
    expires_at: dto.expires_at ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    last_used_at: null,
    created_at: new Date().toISOString(),
    created_by: dto.created_by ?? 'api',
  };

  store.create('api_keys', apiKey);

  // Return the raw key only once
  const { key_hash: _kh, ...safe } = apiKey;
  return c.json({
    data: safe,
    key: raw,
    warning: 'Store this key securely. It cannot be retrieved again.',
  }, 201);
});

// Update API key settings (origins, ip_whitelist, etc.)
apiKeys.patch('/:id', requirePermission('api_keys', 'create'), async (c) => {
  const id = c.req.param('id');
  const merchant = c.get('merchant' as never) as Record<string, unknown>;
  const body = await c.req.json();

  const existing = store.findOne('api_keys', (k: Record<string, unknown>) => k['id'] === id && k['merchant_id'] === merchant['id']);
  if (!existing) {
    return c.json({ error: 'API key not found' }, 404);
  }

  const errors = await validateDto(UpdateApiKeyDto, body);
  if (errors) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  const dto = body as UpdateApiKeyDto;
  const allowed: (keyof UpdateApiKeyDto)[] = ['allowed_origins', 'ip_whitelist', 'expires_at'];
  const updates: Partial<UpdateApiKeyDto> = {};
  for (const key of allowed) {
    if (dto[key] !== undefined) updates[key] = dto[key] as never;
  }

  const updated = store.update('api_keys', id, updates) as Record<string, unknown>;
  const { key_hash: _kh, ...safe } = updated;
  return c.json({ data: safe });
});

// Revoke an API key
apiKeys.post('/:id/revoke', requirePermission('api_keys', 'revoke'), (c) => {
  const id = c.req.param('id');
  const merchant = c.get('merchant' as never) as Record<string, unknown>;

  const existing = store.findOne('api_keys', (k: Record<string, unknown>) => k['id'] === id && k['merchant_id'] === merchant['id']);
  if (!existing) {
    return c.json({ error: 'API key not found' }, 404);
  }

  store.update('api_keys', id, { is_active: false });
  return c.json({ message: 'API key revoked' });
});

export default apiKeys;
