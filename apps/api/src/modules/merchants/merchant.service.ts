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

    if (dto.name !== undefined) merchant.name = dto.name;
    if (dto.ruc !== undefined) merchant.ruc = dto.ruc;
    if (dto.country_code !== undefined) merchant.country_code = dto.country_code;
    if (dto.status !== undefined) merchant.status = dto.status;

    return MerchantRepository.save(merchant);
  }

  async deactivate(id: string): Promise<MerchantEntity | null> {
    const merchant = await MerchantRepository.findOneBy({ id });
    if (!merchant) return null;
    merchant.status = 'inactive';
    return MerchantRepository.save(merchant);
  }

  async delete(id: string): Promise<boolean> {
    const merchant = await MerchantRepository.findOneBy({ id });
    if (!merchant) return false;
    
    await MerchantRepository.remove(merchant);
    return true;
  }
}
