import { AppDataSource } from '../../database/data-source.js';
import { SessionEntity } from './session.entity.js';

export const SessionRepository = AppDataSource.getRepository(SessionEntity);
