import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MerchantEntity } from '../merchants/merchant.entity.js';
import { ApiKeyEntity } from '../api-keys/api-key.entity.js';

@Entity('sessions')
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  api_key_id!: string;

  @Column({ type: 'uuid' })
  merchant_id!: string;

  @Column({ type: 'text' })
  capture_context!: string;

  @Column({ type: 'varchar', length: 50, default: 'CREATED' })
  status!: string;

  @Column({ type: 'jsonb', nullable: true })
  payment_payload!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  callback_url!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cybersource_payment_id!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cybersource_status!: string | null;

  @Column({ type: 'text', nullable: true })
  cybersource_error!: string | null;

  @ManyToOne(() => MerchantEntity, (merchant) => merchant.sessions)
  @JoinColumn({ name: 'merchant_id' })
  merchant!: MerchantEntity;

  @ManyToOne(() => ApiKeyEntity)
  @JoinColumn({ name: 'api_key_id' })
  apiKey!: ApiKeyEntity;
}
