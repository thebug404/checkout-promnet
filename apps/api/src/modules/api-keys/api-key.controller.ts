import type { AppContext } from '../../types.js';
import { ApiKeyService } from './api-key.service.js';
import { CreateApiKeyDto, UpdateApiKeyDto } from './api-key.dto.js';
import { validateDto } from '../../shared/utils/validate.js';

const apiKeyService = new ApiKeyService();

export class ApiKeyController {
  static async findAll(c: AppContext) {
    const merchant = c.get('merchant');
    const keys = merchant
      ? await apiKeyService.findByMerchant(merchant.id)
      : await apiKeyService.findAll();
    const safe = keys.map(({ key_hash: _kh, ...rest }) => rest);
    return c.json({ data: safe });
  }

  static async findById(c: AppContext) {
    const merchant = c.get('merchant');
    const id = c.req.param('id')!;
    const key = merchant
      ? await apiKeyService.findByIdAndMerchant(id, merchant.id)
      : await apiKeyService.findByIdWithRelations(id);
    if (!key) {
      return c.json({ error: 'API key not found' }, 404);
    }
    const { key_hash: _kh, ...safe } = key;
    return c.json({ data: safe });
  }

  static async create(c: AppContext) {
    const body = await c.req.json();

    const errors = await validateDto(CreateApiKeyDto, body);
    if (errors) {
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    const dto = body as CreateApiKeyDto;
    const merchant = c.get('merchant');
    const merchantId = dto.merchant_id ?? merchant?.id;
    if (!merchantId) {
      return c.json({ error: 'merchant_id is required' }, 400);
    }

    const result = await apiKeyService.create(dto, merchantId);
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
    const body = await c.req.json();

    const errors = await validateDto(UpdateApiKeyDto, body);
    if (errors) {
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    const merchant = c.get('merchant');
    const updated = merchant
      ? await apiKeyService.update(c.req.param('id')!, merchant.id, body as UpdateApiKeyDto)
      : await apiKeyService.updateById(c.req.param('id')!, body as UpdateApiKeyDto);
    if (!updated) {
      return c.json({ error: 'API key not found' }, 404);
    }

    const { key_hash: _kh, ...safe } = updated;
    return c.json({ data: safe });
  }

  static async revoke(c: AppContext) {
    const merchant = c.get('merchant');
    const success = merchant
      ? await apiKeyService.revoke(c.req.param('id')!, merchant.id)
      : await apiKeyService.revokeById(c.req.param('id')!);
    if (!success) {
      return c.json({ error: 'API key not found' }, 404);
    }
    return c.json({ message: 'API key revoked' });
  }
}
