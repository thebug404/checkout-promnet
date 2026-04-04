import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MerchantEntity } from '../merchants/merchant.entity.js';

@Entity('merchant_psp_credentials')
export class PspCredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  merchant_id!: string;

  @Column({ type: 'varchar', length: 100 })
  psp_name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  credential_ref!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cybersource_merchant_id!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cybersource_key_id!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  cybersource_secret_key!: string | null;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => MerchantEntity, (merchant) => merchant.psp_credentials)
  @JoinColumn({ name: 'merchant_id' })
  merchant!: MerchantEntity;
}
