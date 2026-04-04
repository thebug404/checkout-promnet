import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiKeyEntity } from '../api-keys/api-key.entity.js';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  api_key_id!: string;

  @Column({ type: 'varchar', length: 255 })
  event_type!: string;

  @Column({ type: 'varchar', length: 50 })
  ip_address!: string;

  @Column({ type: 'varchar', length: 512 })
  endpoint!: string;

  @Column({ type: 'int' })
  http_status!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => ApiKeyEntity, (apiKey) => apiKey.audit_logs)
  @JoinColumn({ name: 'api_key_id' })
  apiKey!: ApiKeyEntity;
}
