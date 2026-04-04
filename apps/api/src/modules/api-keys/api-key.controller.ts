import type { AppContext } from '../../types.js';
import { ApiKeyService } from './api-key.service.js';
import { CreateApiKeyDto, UpdateApiKeyDto } from './api-key.dto.js';
import { validateDto } from '../../shared/utils/validate.js';

const apiKeyService = new ApiKeyService();

export class ApiKeyController {
  static async findAll(c: AppContext) {
    const merchant = c.get('merchant');
    const keys = await apiKeyService.findByMerchant(merchant.id);
    const safe = keys.map(({ key_hash: _kh, ...rest }) => rest);
    return c.json({ data: safe });
  }

  static async findById(c: AppContext) {
    const merchant = c.get('merchant');
    const key = await apiKeyService.findByIdAndMerchant(c.req.param('id')!, merchant.id);
    if (!key) {
      return c.json({ error: 'API key not found' }, 404);
    }
    const { key_hash: _kh, ...safe } = key;
    return c.json({ data: safe });
  }

  static async create(c: AppContext) {
    const merchant = c.get('merchant');
    const body = await c.req.json();

    const errors = await validateDto(CreateApiKeyDto, body);
    if (errors) {
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    const result = await apiKeyService.create(body as CreateApiKeyDto, merchant.id);
    if (!result) {
      return c.json({ error: 'Role not found' }, 404);
    }

    const { key_hash: _kh, ...safe } = result.apiKey;
    return c.json({
      data: safe,
      key: result.rawKey,
      warning: 'Store this key securely. It cannot be retrieved again.',
    }, 201);
  }

  static async update(c: AppContext) {
    const merchant = c.get('merchant');
    const body = await c.req.json();

    const errors = await validateDto(UpdateApiKeyDto, body);
    if (errors) {
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    const updated = await apiKeyService.update(c.req.param('id')!, merchant.id, body as UpdateApiKeyDto);
    if (!updated) {
      return c.json({ error: 'API key not found' }, 404);
    }

    const { key_hash: _kh, ...safe } = updated;
    return c.json({ data: safe });
  }

  static async revoke(c: AppContext) {
    const merchant = c.get('merchant');
    const success = await apiKeyService.revoke(c.req.param('id')!, merchant.id);
    if (!success) {
      return c.json({ error: 'API key not found' }, 404);
    }
    return c.json({ message: 'API key revoked' });
  }
}
