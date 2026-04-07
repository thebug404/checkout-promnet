import 'reflect-metadata';
import { fileURLToPath } from 'url';
import { DataSource } from 'typeorm';
import { AppDataSource } from './data-source.js';
import { MerchantEntity } from '../modules/merchants/merchant.entity.js';
import { RoleEntity } from '../modules/roles/role.entity.js';
import { PermissionEntity } from '../modules/roles/permission.entity.js';
import { ApiKeyEntity } from '../modules/api-keys/api-key.entity.js';
import { PspCredentialEntity } from '../modules/psp-credentials/psp-credential.entity.js';
import { generateApiKey, hashApiKey } from '../shared/utils/crypto.js';

const permissionData: Array<Pick<PermissionEntity, 'resource' | 'action'>> = [
  { resource: 'sessions', action: 'create' },
  { resource: 'sessions', action: 'read' },
  { resource: 'merchants', action: 'create' },
  { resource: 'merchants', action: 'read' },
  { resource: 'merchants', action: 'update' },
  { resource: 'merchants', action: 'delete' },
  { resource: 'api_keys', action: 'create' },
  { resource: 'api_keys', action: 'read' },
  { resource: 'api_keys', action: 'revoke' },
  { resource: 'api_keys', action: 'delete' },
  { resource: 'psp_credentials', action: 'create' },
  { resource: 'psp_credentials', action: 'read' },
  { resource: 'psp_credentials', action: 'update' },
  { resource: 'psp_credentials', action: 'delete' },
  { resource: 'audit_logs', action: 'read' },
];

type GeneratedKey = { merchant: string; key: string };

export async function seedExampleDataIfTablesEmpty(dataSource: DataSource = AppDataSource) {
  const permissionRepo = dataSource.getRepository(PermissionEntity);
  const roleRepo = dataSource.getRepository(RoleEntity);
  const merchantRepo = dataSource.getRepository(MerchantEntity);
  const apiKeyRepo = dataSource.getRepository(ApiKeyEntity);
  const pspRepo = dataSource.getRepository(PspCredentialEntity);

  const plainKeys: GeneratedKey[] = [];

  // Seed each table independently only when it is empty.
  const permissionCount = await permissionRepo.count();
  if (permissionCount === 0) {
    await permissionRepo.save(permissionRepo.create(permissionData));
    console.log('✅ Seeded table: permissions');
  } else {
    console.log('ℹ️ Skipping permissions seed (table is not empty)');
  }

  const permissions = await permissionRepo.find();

  const roleCount = await roleRepo.count();
  if (roleCount === 0) {
    const adminRole = roleRepo.create({
      name: 'admin',
      description: 'Full access to all resources',
      permissions,
    });

    const sessionCreatorPerms = permissions.filter(
      (p) => p.resource === 'sessions' || (p.resource === 'merchants' && p.action === 'read'),
    );
    const sessionCreatorRole = roleRepo.create({
      name: 'session_creator',
      description: 'Can create and read payment sessions',
      permissions: sessionCreatorPerms,
    });

    const readonlyPerms = permissions.filter((p) => p.action === 'read');
    const readonlyRole = roleRepo.create({
      name: 'readonly',
      description: 'Read-only access to resources',
      permissions: readonlyPerms,
    });

    await roleRepo.save([adminRole, sessionCreatorRole, readonlyRole]);
    console.log('✅ Seeded table: roles');
  } else {
    console.log('ℹ️ Skipping roles seed (table is not empty)');
  }

  const merchantCount = await merchantRepo.count();
  if (merchantCount === 0) {
    await merchantRepo.save(
      merchantRepo.create([
        { name: 'Acme Corp', ruc: '20100100100', country_code: 'PE', status: 'active' },
        { name: 'MegaStore Inc', ruc: '30200200200', country_code: 'US', status: 'active' },
      ]),
    );
    console.log('✅ Seeded table: merchants');
  } else {
    console.log('ℹ️ Skipping merchants seed (table is not empty)');
  }

  const apiKeyCount = await apiKeyRepo.count();
  if (apiKeyCount === 0) {
    const merchants = await merchantRepo.find();
    const adminRole = await roleRepo.findOne({ where: { name: 'admin' } });

    if (!adminRole || merchants.length === 0) {
      console.log('⚠️ Skipping api_keys seed (missing admin role or merchants)');
    } else {
      for (const merchant of merchants) {
        const { raw, prefix } = generateApiKey();
        const keyHash = hashApiKey(raw);

        const apiKey = apiKeyRepo.create({
          merchant_id: merchant.id,
          role_id: adminRole.id,
          key_prefix: prefix,
          key_hash: keyHash!,
          allowed_origins: [
            'https://localhost:8181',
            'https://localhost:3000',
            'https://localhost:5173',
            'https://localhost:8443',
          ],
          ip_whitelist: [],
          is_active: true,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          last_used_at: null,
          created_by: 'system',
        });

        await apiKeyRepo.save(apiKey);
        plainKeys.push({ merchant: merchant.name, key: raw });
      }

      console.log('✅ Seeded table: api_keys');
    }
  } else {
    console.log('ℹ️ Skipping api_keys seed (table is not empty)');
  }

  const pspCredentialCount = await pspRepo.count();
  if (pspCredentialCount === 0) {
    const merchants = await merchantRepo.find();
    if (merchants.length === 0) {
      console.log('⚠️ Skipping merchant_psp_credentials seed (no merchants found)');
    } else {
      for (const merchant of merchants) {
        const psp = pspRepo.create({
          merchant_id: merchant.id,
          psp_name: 'cybersource',
          credential_ref: null,
          cybersource_merchant_id: process.env.CYBERSOURCE_MERCHANT_ID || 'YOUR_MERCHANT_ID',
          cybersource_key_id: process.env.CYBERSOURCE_KEY_ID || 'YOUR_KEY_ID',
          cybersource_secret_key: process.env.CYBERSOURCE_SECRET_KEY || 'YOUR_SECRET_KEY',
          is_active: true,
        });

        await pspRepo.save(psp);
      }

      console.log('✅ Seeded table: merchant_psp_credentials');
    }
  } else {
    console.log('ℹ️ Skipping merchant_psp_credentials seed (table is not empty)');
  }

  if (plainKeys.length > 0) {
    console.log('\nGenerated API Keys (save these, they cannot be retrieved later):\n');
    for (const pk of plainKeys) {
      console.log(`  ${pk.merchant}: ${pk.key}`);
    }
    console.log('');
  }
}

async function runSeedScript() {
  await AppDataSource.initialize();
  console.log('📦 Database connected');

  await seedExampleDataIfTablesEmpty(AppDataSource);

  console.log('\n✅ Seed process completed\n');
  await AppDataSource.destroy();
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  runSeedScript().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
}
