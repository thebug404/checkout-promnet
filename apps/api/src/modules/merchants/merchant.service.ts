import { MerchantRepository } from './merchant.repository.js';
import { MerchantEntity } from './merchant.entity.js';
import { CreateMerchantDto, UpdateMerchantDto } from './merchant.dto.js';

export class MerchantService {
  async findAll(): Promise<MerchantEntity[]> {
    return MerchantRepository.find();
  }

  async findById(id: string): Promise<MerchantEntity | null> {
    return MerchantRepository.findOneBy({ id });
  }

  async findByRuc(ruc: string): Promise<MerchantEntity | null> {
    return MerchantRepository.findOneBy({ ruc });
  }

  async create(dto: CreateMerchantDto): Promise<MerchantEntity> {
    const merchant = MerchantRepository.create({
      name: dto.name,
      ruc: dto.ruc,
      country_code: dto.country_code,
      status: 'active',
    });
    return MerchantRepository.save(merchant);
  }

  async update(id: string, dto: UpdateMerchantDto): Promise<MerchantEntity | null> {
    const merchant = await MerchantRepository.findOneBy({ id });
    if (!merchant) return null;

    const allowed: (keyof UpdateMerchantDto)[] = ['name', 'ruc', 'country_code', 'status'];
    for (const key of allowed) {
      if (dto[key] !== undefined) {
        (merchant as unknown as Record<string, unknown>)[key] = dto[key];
      }
    }
    return MerchantRepository.save(merchant);
  }

  async deactivate(id: string): Promise<MerchantEntity | null> {
    const merchant = await MerchantRepository.findOneBy({ id });
    if (!merchant) return null;
    merchant.status = 'inactive';
    return MerchantRepository.save(merchant);
  }
}
