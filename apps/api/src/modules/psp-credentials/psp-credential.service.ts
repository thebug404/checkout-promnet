import { PspCredentialRepository } from './psp-credential.repository.js';
import { PspCredentialEntity } from './psp-credential.entity.js';
import { CreatePspCredentialDto, UpdatePspCredentialDto } from './psp-credential.dto.js';

export class PspCredentialService {
  async findByMerchant(merchantId: string): Promise<PspCredentialEntity[]> {
    return PspCredentialRepository.findBy({ merchant_id: merchantId });
  }

  async findByIdAndMerchant(id: string, merchantId: string): Promise<PspCredentialEntity | null> {
    return PspCredentialRepository.findOneBy({ id, merchant_id: merchantId });
  }

  async findActiveCybersource(merchantId: string): Promise<PspCredentialEntity | null> {
    return PspCredentialRepository.findOneBy({
      merchant_id: merchantId,
      is_active: true,
      psp_name: 'cybersource',
    });
  }

  async create(dto: CreatePspCredentialDto, merchantId: string): Promise<PspCredentialEntity> {
    const credential = PspCredentialRepository.create({
      merchant_id: merchantId,
      psp_name: dto.psp_name,
      credential_ref: dto.credential_ref ?? null,
      cybersource_merchant_id: dto.cybersource_merchant_id ?? null,
      cybersource_key_id: dto.cybersource_key_id ?? null,
      cybersource_secret_key: dto.cybersource_secret_key ?? null,
      is_active: true,
    });
    return PspCredentialRepository.save(credential);
  }

  async update(id: string, merchantId: string, dto: UpdatePspCredentialDto): Promise<PspCredentialEntity | null> {
    const credential = await PspCredentialRepository.findOneBy({ id, merchant_id: merchantId });
    if (!credential) return null;

    const allowed: (keyof UpdatePspCredentialDto)[] = [
      'credential_ref', 'is_active', 'cybersource_merchant_id',
      'cybersource_key_id', 'cybersource_secret_key',
    ];
    for (const key of allowed) {
      if (dto[key] !== undefined) {
        (credential as unknown as Record<string, unknown>)[key] = dto[key];
      }
    }
    return PspCredentialRepository.save(credential);
  }
}
