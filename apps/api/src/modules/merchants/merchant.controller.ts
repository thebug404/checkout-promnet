import type { AppContext } from '../../types.js';
import { MerchantService } from './merchant.service.js';
import { CreateMerchantDto, UpdateMerchantDto } from './merchant.dto.js';
import { validateDto } from '../../shared/utils/validate.js';
import { randomBytes } from 'node:crypto';

const merchantService = new MerchantService();

export class MerchantController {
  static async findAll(c: AppContext) {
    const merchants = await merchantService.findAll();
    return c.json({ data: merchants });
  }

  static async findById(c: AppContext) {
    const merchant = await merchantService.findById(c.req.param('id')!);
    if (!merchant) {
      return c.json({ error: 'Merchant not found' }, 404);
    }
    return c.json({ data: merchant });
  }

  static async create(c: AppContext) {
    const body = await c.req.json();

    const errors = await validateDto(CreateMerchantDto, body);
    if (errors) {
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    const dto = body as CreateMerchantDto;

    // Si no se proporciona RUC, generar un hash único
    if (!dto.ruc) {
      dto.ruc = `auto_${randomBytes(16).toString('hex')}`;
    } else {
      // Solo verificar duplicados si se proporciona un RUC
      const existing = await merchantService.findByRuc(dto.ruc);
      if (existing) {
        return c.json({ error: 'Merchant with this RUC already exists' }, 409);
      }
    }

    const merchant = await merchantService.create(dto);
    return c.json({ data: merchant }, 201);
  }

  static async update(c: AppContext) {
    const body = await c.req.json();

    const errors = await validateDto(UpdateMerchantDto, body);
    if (errors) {
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    const updated = await merchantService.update(c.req.param('id')!, body as UpdateMerchantDto);
    if (!updated) {
      return c.json({ error: 'Merchant not found' }, 404);
    }
    return c.json({ data: updated });
  }

  static async delete(c: AppContext) {
    try {
      const success = await merchantService.delete(c.req.param('id')!);
      if (!success) {
        return c.json({ error: 'Merchant not found' }, 404);
      }
      return c.json({ message: 'Comercio eliminado correctamente' });
    } catch (e: any) {
      // Manejar error de violación de restricción de clave foránea
      if (e.code === '23503') {
        const constraintName = e.constraint || '';
        let message = 'No se puede eliminar el comercio porque tiene registros asociados';
        
        if (constraintName.includes('api_keys')) {
          message = 'No se puede eliminar el comercio porque tiene API Keys asociadas. Elimina primero todas las API Keys de este comercio.';
        } else if (constraintName.includes('psp_credentials')) {
          message = 'No se puede eliminar el comercio porque tiene credenciales PSP asociadas. Elimina primero todas las credenciales de este comercio.';
        }
        
        return c.json({ error: message }, 409);
      }
      
      // Error genérico
      console.error('Error deleting merchant:', e);
      return c.json({ error: 'Error al eliminar el comercio' }, 500);
    }
  }
}
