import { AppDataSource } from '../../database/data-source.js';
import { PspCredentialEntity } from './psp-credential.entity.js';

export const PspCredentialRepository = AppDataSource.getRepository(PspCredentialEntity);
