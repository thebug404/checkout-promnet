import { AppDataSource } from '../../database/data-source.js';
import { ApiKeyEntity } from './api-key.entity.js';

export const ApiKeyRepository = AppDataSource.getRepository(ApiKeyEntity);
