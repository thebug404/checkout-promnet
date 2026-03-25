import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import * as store from '../store/index.js';
import { requirePermission } from '../middleware/auth.js';

const merchants = new Hono();

// List all merchants
merchants.get('/', requirePermission('merchants', 'read'), (c) => {
  const all = store.findAll('merchants');
  return c.json({ data: all });
});

// Get merchant by ID
merchants.get('/:id', requirePermission('merchants', 'read'), (c) => {
  const merchant = store.findById('merchants', c.req.param('id'));
  if (!merchant) {
    return c.json({ error: 'Merchant not found' }, 404);
  }
  return c.json({ data: merchant });
});

// Create merchant
merchants.post('/', requirePermission('merchants', 'create'), async (c) => {
  const body = await c.req.json();

  if (!body.name || !body.ruc || !body.country_code) {
    return c.json({ error: 'name, ruc, and country_code are required' }, 400);
  }

  // Check duplicate RUC
  const existing = store.findOne('merchants', (m) => m.ruc === body.ruc);
  if (existing) {
    return c.json({ error: 'Merchant with this RUC already exists' }, 409);
  }

  const merchant = {
    id: randomUUID(),
    name: body.name,
    ruc: body.ruc,
    country_code: body.country_code,
    status: 'active',
    created_at: new Date().toISOString(),
  };

  store.create('merchants', merchant);
  return c.json({ data: merchant }, 201);
});

// Update merchant
merchants.patch('/:id', requirePermission('merchants', 'update'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const allowed = ['name', 'ruc', 'country_code', 'status'];
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const updated = store.update('merchants', id, updates);
  if (!updated) {
    return c.json({ error: 'Merchant not found' }, 404);
  }
  return c.json({ data: updated });
});

// Delete (deactivate) merchant
merchants.delete('/:id', requirePermission('merchants', 'delete'), (c) => {
  const id = c.req.param('id');
  const updated = store.update('merchants', id, { status: 'inactive' });
  if (!updated) {
    return c.json({ error: 'Merchant not found' }, 404);
  }
  return c.json({ message: 'Merchant deactivated' });
});

export default merchants;
