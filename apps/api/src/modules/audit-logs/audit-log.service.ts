import { AuditLogRepository } from './audit-log.repository.js';
import { AuditLogEntity } from './audit-log.entity.js';
import { ApiKeyRepository } from '../api-keys/api-key.repository.js';

export class AuditLogService {
  async create(data: Partial<AuditLogEntity>): Promise<AuditLogEntity> {
    const log = AuditLogRepository.create(data);
    return AuditLogRepository.save(log);
  }

  async findByMerchant(merchantId: string, page: number, limit: number) {
    const merchantKeys = await ApiKeyRepository.findBy({ merchant_id: merchantId });
    const keyIds = merchantKeys.map((k) => k.id);

    if (keyIds.length === 0) {
      return { data: [], total: 0 };
    }

    const [data, total] = await AuditLogRepository.createQueryBuilder('log')
      .where('log.api_key_id IN (:...keyIds)', { keyIds })
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }
}
