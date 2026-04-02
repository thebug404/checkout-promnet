import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import * as store from '../store/index.js';
import { requirePermission } from '../middleware/auth.js';

const pspCredentials = new Hono();

// List PSP credentials for the authenticated merchant
pspCredentials.get('/', requirePermission('psp_credentials', 'read'), (c) => {
  const merchant = c.get('merchant');
  const creds = store.findMany('merchant_psp_credentials', (cr) => cr.merchant_id === merchant.id);
  // Mask secret keys in response
  const safe = creds.map(({ cybersource_secret_key, ...rest }) => ({
    ...rest,
    cybersource_secret_key: cybersource_secret_key ? '***' : null,
  }));
  return c.json({ data: safe });
});

// Create PSP credential
pspCredentials.post('/', requirePermission('psp_credentials', 'create'), async (c) => {
  const merchant = c.get('merchant');
  const body = await c.req.json();

  if (!body.psp_name) {
    return c.json({ error: 'psp_name is required' }, 400);
  }

  // Validate CyberSource-specific fields
  if (body.psp_name === 'cybersource') {
    if (!body.cybersource_merchant_id || !body.cybersource_key_id || !body.cybersource_secret_key) {
      return c.json({
        error: 'cybersource_merchant_id, cybersource_key_id, and cybersource_secret_key are required for CyberSource PSP',
      }, 400);
    }
  }

  const credential = {
    id: randomUUID(),
    merchant_id: merchant.id,
    psp_name: body.psp_name,
    credential_ref: body.credential_ref || null,
    cybersource_merchant_id: body.cybersource_merchant_id || null,
    cybersource_key_id: body.cybersource_key_id || null,
    cybersource_secret_key: body.cybersource_secret_key || null,
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
  const merchant = c.get('merchant');
  const body = await c.req.json();

  const existing = store.findOne(
    'merchant_psp_credentials',
    (cr) => cr.id === id && cr.merchant_id === merchant.id
  );
  if (!existing) {
    return c.json({ error: 'PSP credential not found' }, 404);
  }

  const allowed = ['credential_ref', 'is_active', 'cybersource_merchant_id', 'cybersource_key_id', 'cybersource_secret_key'];
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const updated = store.update('merchant_psp_credentials', id, updates);
  const { cybersource_secret_key, ...safe } = updated;
  return c.json({ data: { ...safe, cybersource_secret_key: cybersource_secret_key ? '***' : null } });
});

export default pspCredentials;
