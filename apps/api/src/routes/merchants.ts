import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import * as store from '../store/index.js';
import { requirePermission } from '../middleware/auth.js';
import { validateDto } from '../utils/validate.js';
import { CreateMerchantDto, UpdateMerchantDto } from '../dtos/merchant.dto.js';

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

  const errors = await validateDto(CreateMerchantDto, body);
  if (errors) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  const dto = body as CreateMerchantDto;

  // Check duplicate RUC
  const existing = store.findOne('merchants', (m: Record<string, unknown>) => m['ruc'] === dto.ruc);
  if (existing) {
    return c.json({ error: 'Merchant with this RUC already exists' }, 409);
  }

  const merchant = {
    id: randomUUID(),
    name: dto.name,
    ruc: dto.ruc,
    country_code: dto.country_code,
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

  const errors = await validateDto(UpdateMerchantDto, body);
  if (errors) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  const dto = body as UpdateMerchantDto;
  const allowed: (keyof UpdateMerchantDto)[] = ['name', 'ruc', 'country_code', 'status'];
  const updates: Partial<UpdateMerchantDto> = {};
  for (const key of allowed) {
    if (dto[key] !== undefined) updates[key] = dto[key];
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

