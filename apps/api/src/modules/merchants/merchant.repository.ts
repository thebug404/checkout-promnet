import { AppDataSource } from '../../database/data-source.js';
import { MerchantEntity } from './merchant.entity.js';

export const MerchantRepository = AppDataSource.getRepository(MerchantEntity);
