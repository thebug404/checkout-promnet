import { SessionRepository } from './session.repository.js';
import { SessionEntity } from './session.entity.js';

interface CreateSessionData {
  api_key_id: string;
  merchant_id: string;
  capture_context: string;
  status: string;
  payment_payload: Record<string, unknown> | null;
  callback_url: string | null;
  expires_at: Date;
}

export class SessionService {
  async findByMerchant(merchantId: string): Promise<SessionEntity[]> {
    return SessionRepository.findBy({ merchant_id: merchantId });
  }

  async findByIdAndMerchant(id: string, merchantId: string): Promise<SessionEntity | null> {
    return SessionRepository.findOneBy({ id, merchant_id: merchantId });
  }

  async create(data: CreateSessionData): Promise<SessionEntity> {
    const session = SessionRepository.create(data);
    return SessionRepository.save(session);
  }

  async updateStatus(
    id: string,
    updates: Partial<Pick<SessionEntity, 'status' | 'cybersource_payment_id' | 'cybersource_status' | 'cybersource_error'>>,
  ): Promise<SessionEntity | null> {
    const session = await SessionRepository.findOneBy({ id });
    if (!session) return null;
    Object.assign(session, updates);
    return SessionRepository.save(session);
  }
}
