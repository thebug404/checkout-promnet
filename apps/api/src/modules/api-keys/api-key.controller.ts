import type { AppContext } from '../../types.js';
import { ApiKeyService } from './api-key.service.js';
import { CreateApiKeyDto, UpdateApiKeyDto } from './api-key.dto.js';
import { validateDto } from '../../shared/utils/validate.js';

const apiKeyService = new ApiKeyService();

export class ApiKeyController {
  static async findAll(c: AppContext) {
    const merchantId = c.req.param('merchantId')!;
    const keys = await apiKeyService.findByMerchant(merchantId);
    const safe = keys.map(({ key_hash: _kh, ...rest }) => rest);
    return c.json({ data: safe });
  }

  static async findById(c: AppContext) {
    const merchantId = c.req.param('merchantId')!;
    const id = c.req.param('id')!;
    const key = await apiKeyService.findByIdAndMerchant(id, merchantId);
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
    const merchantId = c.req.param('merchantId')!;

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

    const merchantId = c.req.param('merchantId')!;
    const updated = await apiKeyService.update(c.req.param('id')!, merchantId, body as UpdateApiKeyDto);
    if (!updated) {
      return c.json({ error: 'API key not found' }, 404);
    }

    const { key_hash: _kh, ...safe } = updated;
    return c.json({ data: safe });
  }

  static async revoke(c: AppContext) {
    const merchantId = c.req.param('merchantId')!;
    const success = await apiKeyService.revoke(c.req.param('id')!, merchantId);
    if (!success) {
      return c.json({ error: 'API key not found' }, 404);
    }
    return c.json({ message: 'API key revoked' });
  }

  static async delete(c: AppContext) {
    try {
      const merchantId = c.req.param('merchantId')!;
      const success = await apiKeyService.delete(c.req.param('id')!, merchantId);
      if (!success) {
        return c.json({ error: 'API key not found' }, 404);
      }
      return c.json({ message: 'API Key eliminada correctamente' });
    } catch (e: any) {
      // Manejar error de violación de restricción de clave foránea
      if (e.code === '23503') {
        return c.json({ 
          error: 'No se puede eliminar la API Key porque tiene registros asociados. Elimina primero todos los registros relacionados.'
        }, 409);
      }
      
      console.error('Error deleting API key:', e);
      return c.json({ error: 'Error al eliminar la API Key' }, 500);
    }
  }
}
