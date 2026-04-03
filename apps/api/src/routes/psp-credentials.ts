import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import * as store from '../store/index.js';
import { requirePermission } from '../middleware/auth.js';
import { validateDto } from '../utils/validate.js';
import { CreatePspCredentialDto, UpdatePspCredentialDto } from '../dtos/psp-credential.dto.js';

const pspCredentials = new Hono();

// List PSP credentials for the authenticated merchant
pspCredentials.get('/', requirePermission('psp_credentials', 'read'), (c) => {
  const merchant = c.get('merchant' as never) as Record<string, unknown>;
  const creds = store.findMany('merchant_psp_credentials', (cr: Record<string, unknown>) => cr['merchant_id'] === merchant['id']) as Record<string, unknown>[];
  // Mask secret keys in response
  const safe = creds.map(({ cybersource_secret_key, ...rest }) => ({
    ...rest,
    cybersource_secret_key: cybersource_secret_key ? '***' : null,
  }));
  return c.json({ data: safe });
});

// Create PSP credential
pspCredentials.post('/', requirePermission('psp_credentials', 'create'), async (c) => {
  const merchant = c.get('merchant' as never) as Record<string, unknown>;
  const body = await c.req.json();

  const errors = await validateDto(CreatePspCredentialDto, body);
  if (errors) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  const dto = body as CreatePspCredentialDto;

  const credential = {
    id: randomUUID(),
    merchant_id: merchant['id'],
    psp_name: dto.psp_name,
    credential_ref: dto.credential_ref ?? null,
    cybersource_merchant_id: dto.cybersource_merchant_id ?? null,
    cybersource_key_id: dto.cybersource_key_id ?? null,
    cybersource_secret_key: dto.cybersource_secret_key ?? null,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  store.create('merchant_psp_credentials', credential);

  // Don't expose the secret key in the response
  const { cybersource_secret_key, ...safe } = credential;
  return c.json({ data: { ...safe, cybersource_secret_key: cybersource_secret_key ? '***' : null } }, 201);
});

// Update PSP credential
pspCredentials.patch('/:id', requirePermission('psp_credentials', 'update'), async (c) => {
  const id = c.req.param('id');
  const merchant = c.get('merchant' as never) as Record<string, unknown>;
  const body = await c.req.json();

  const existing = store.findOne(
    'merchant_psp_credentials',
    (cr: Record<string, unknown>) => cr['id'] === id && cr['merchant_id'] === merchant['id']
  );
  if (!existing) {
    return c.json({ error: 'PSP credential not found' }, 404);
  }

  const errors = await validateDto(UpdatePspCredentialDto, body);
  if (errors) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  const dto = body as UpdatePspCredentialDto;
  const allowed: (keyof UpdatePspCredentialDto)[] = ['credential_ref', 'is_active', 'cybersource_merchant_id', 'cybersource_key_id', 'cybersource_secret_key'];
  const updates: Partial<UpdatePspCredentialDto> = {};
  for (const key of allowed) {
    if (dto[key] !== undefined) updates[key] = dto[key] as never;
  }

  const updated = store.update('merchant_psp_credentials', id, updates) as Record<string, unknown>;
  const { cybersource_secret_key, ...safe } = updated;
  return c.json({ data: { ...safe, cybersource_secret_key: cybersource_secret_key ? '***' : null } });
});

export default pspCredentials;
