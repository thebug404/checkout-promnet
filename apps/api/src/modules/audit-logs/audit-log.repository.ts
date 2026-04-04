import { AppDataSource } from '../../database/data-source.js';
import { AuditLogEntity } from './audit-log.entity.js';

export const AuditLogRepository = AppDataSource.getRepository(AuditLogEntity);
