import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { MerchantEntity } from '../merchants/merchant.entity.js';
import { RoleEntity } from '../roles/role.entity.js';
import { AuditLogEntity } from '../audit-logs/audit-log.entity.js';

@Entity('api_keys')
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  merchant_id!: string;

  @Column({ type: 'uuid' })
  role_id!: string;

  @Column({ type: 'varchar', length: 20 })
  key_prefix!: string;

  @Column({ type: 'varchar', length: 255 })
  key_hash!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  allowed_origins!: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  ip_whitelist!: string[];

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_used_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ type: 'varchar', length: 100, default: 'system' })
  created_by!: string;

  @ManyToOne(() => MerchantEntity, (merchant) => merchant.api_keys)
  @JoinColumn({ name: 'merchant_id' })
  merchant!: MerchantEntity;

  @ManyToOne(() => RoleEntity, (role) => role.api_keys)
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  @OneToMany(() => AuditLogEntity, (log) => log.apiKey)
  audit_logs!: AuditLogEntity[];
}
