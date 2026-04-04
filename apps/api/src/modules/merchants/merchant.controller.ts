import type { AppContext } from '../../types.js';
import { MerchantService } from './merchant.service.js';
import { CreateMerchantDto, UpdateMerchantDto } from './merchant.dto.js';
import { validateDto } from '../../shared/utils/validate.js';

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

    const existing = await merchantService.findByRuc(dto.ruc);
    if (existing) {
      return c.json({ error: 'Merchant with this RUC already exists' }, 409);
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
    const updated = await merchantService.deactivate(c.req.param('id')!);
    if (!updated) {
      return c.json({ error: 'Merchant not found' }, 404);
    }
    return c.json({ message: 'Merchant deactivated' });
  }
}
