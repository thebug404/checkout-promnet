import { ApiKeyRepository } from './api-key.repository.js';
import { ApiKeyEntity } from './api-key.entity.js';
import { CreateApiKeyDto, UpdateApiKeyDto } from './api-key.dto.js';
import { generateApiKey, hashApiKey } from '../../shared/utils/crypto.js';
import { RoleRepository } from '../roles/role.repository.js';

export class ApiKeyService {
  async findByMerchant(merchantId: string): Promise<ApiKeyEntity[]> {
    return ApiKeyRepository.findBy({ merchant_id: merchantId });
  }

  async findByIdAndMerchant(id: string, merchantId: string): Promise<ApiKeyEntity | null> {
    return ApiKeyRepository.findOneBy({ id, merchant_id: merchantId });
  }

  async findByPrefix(prefix: string): Promise<ApiKeyEntity | null> {
    return ApiKeyRepository.findOneBy({ key_prefix: prefix });
  }

  async findByIdWithRole(id: string): Promise<ApiKeyEntity | null> {
    return ApiKeyRepository.findOne({
      where: { id },
      relations: ['role', 'role.permissions'],
    });
  }

  async findByPrefixWithRelations(prefix: string): Promise<ApiKeyEntity | null> {
    return ApiKeyRepository.findOne({
      where: { key_prefix: prefix },
      relations: ['role', 'role.permissions', 'merchant'],
    });
  }

  async create(dto: CreateApiKeyDto, merchantId: string): Promise<{ apiKey: ApiKeyEntity; rawKey: string } | null> {
    const role = await RoleRepository.findOneBy({ id: dto.role_id });
    if (!role) return null;

    const { raw, prefix } = generateApiKey();
    const keyHash = hashApiKey(raw);

    const apiKey = ApiKeyRepository.create({
      merchant_id: merchantId,
      role_id: dto.role_id,
      key_prefix: prefix,
      key_hash: keyHash!,
      allowed_origins: dto.allowed_origins ?? [],
      ip_whitelist: dto.ip_whitelist ?? [],
      is_active: true,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      last_used_at: null,
      created_by: dto.created_by ?? 'api',
    });

    const saved = await ApiKeyRepository.save(apiKey);
    return { apiKey: saved, rawKey: raw };
  }

  async update(id: string, merchantId: string, dto: UpdateApiKeyDto): Promise<ApiKeyEntity | null> {
    const apiKey = await ApiKeyRepository.findOneBy({ id, merchant_id: merchantId });
    if (!apiKey) return null;

    if (dto.allowed_origins !== undefined) apiKey.allowed_origins = dto.allowed_origins;
    if (dto.ip_whitelist !== undefined) apiKey.ip_whitelist = dto.ip_whitelist;
    if (dto.expires_at !== undefined) apiKey.expires_at = new Date(dto.expires_at);

    return ApiKeyRepository.save(apiKey);
  }

  async revoke(id: string, merchantId: string): Promise<boolean> {
    const apiKey = await ApiKeyRepository.findOneBy({ id, merchant_id: merchantId });
    if (!apiKey) return false;
    apiKey.is_active = false;
    await ApiKeyRepository.save(apiKey);
    return true;
  }

  async updateLastUsed(id: string): Promise<void> {
    await ApiKeyRepository.update(id, { last_used_at: new Date() });
  }
}
