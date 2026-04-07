import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiKeyEntity } from '../api-keys/api-key.entity.js';
import { PspCredentialEntity } from '../psp-credentials/psp-credential.entity.js';
import { SessionEntity } from '../sessions/session.entity.js';

@Entity('merchants')
export class MerchantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  ruc?: string | null;

  @Column({ type: 'varchar', length: 5 })
  country_code!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @OneToMany(() => ApiKeyEntity, (apiKey) => apiKey.merchant)
  api_keys!: ApiKeyEntity[];

  @OneToMany(() => PspCredentialEntity, (cred) => cred.merchant)
  psp_credentials!: PspCredentialEntity[];

  @OneToMany(() => SessionEntity, (session) => session.merchant)
  sessions!: SessionEntity[];
}
