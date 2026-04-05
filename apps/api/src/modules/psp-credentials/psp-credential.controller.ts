import type { AppContext } from '../../types.js';
import { PspCredentialService } from './psp-credential.service.js';
import { CreatePspCredentialDto, UpdatePspCredentialDto } from './psp-credential.dto.js';
import { validateDto } from '../../shared/utils/validate.js';

const pspCredentialService = new PspCredentialService();

export class PspCredentialController {
  static async findAll(c: AppContext) {
    const merchant = c.get('merchant');
    const creds = merchant
      ? await pspCredentialService.findByMerchant(merchant.id)
      : await pspCredentialService.findAll();
    const safe = creds.map(({ cybersource_secret_key, ...rest }) => ({
      ...rest,
      cybersource_secret_key: cybersource_secret_key ? '***' : null,
    }));
    return c.json({ data: safe });
  }

  static async create(c: AppContext) {
    const body = await c.req.json();

    const errors = await validateDto(CreatePspCredentialDto, body);
    if (errors) {
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    const dto = body as CreatePspCredentialDto;
    const merchant = c.get('merchant');
    const merchantId = dto.merchant_id ?? merchant?.id;
    if (!merchantId) {
      return c.json({ error: 'merchant_id is required' }, 400);
    }

    const credential = await pspCredentialService.create(dto, merchantId);
    const { cybersource_secret_key, ...safe } = credential;
    return c.json({ data: { ...safe, cybersource_secret_key: cybersource_secret_key ? '***' : null } }, 201);
  }

  static async update(c: AppContext) {
    const body = await c.req.json();

    const errors = await validateDto(UpdatePspCredentialDto, body);
    if (errors) {
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    const merchant = c.get('merchant');
    const updated = merchant
      ? await pspCredentialService.update(c.req.param('id')!, merchant.id, body as UpdatePspCredentialDto)
      : await pspCredentialService.updateById(c.req.param('id')!, body as UpdatePspCredentialDto);
    if (!updated) {
      return c.json({ error: 'PSP credential not found' }, 404);
    }

    const { cybersource_secret_key, ...safe } = updated;
    return c.json({ data: { ...safe, cybersource_secret_key: cybersource_secret_key ? '***' : null } });
  }
}
