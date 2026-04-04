import 'reflect-metadata';
import { AppDataSource } from './data-source.js';
import { MerchantEntity } from '../modules/merchants/merchant.entity.js';
import { RoleEntity } from '../modules/roles/role.entity.js';
import { PermissionEntity } from '../modules/roles/permission.entity.js';
import { ApiKeyEntity } from '../modules/api-keys/api-key.entity.js';
import { PspCredentialEntity } from '../modules/psp-credentials/psp-credential.entity.js';
import { generateApiKey, hashApiKey } from '../shared/utils/crypto.js';

async function seed() {
  await AppDataSource.initialize();
  console.log('📦 Database connected');

  // --- Permissions ---
  const permissionRepo = AppDataSource.getRepository(PermissionEntity);
  const permissionData = [
    { resource: 'sessions', action: 'create' },
    { resource: 'sessions', action: 'read' },
    { resource: 'merchants', action: 'create' },
    { resource: 'merchants', action: 'read' },
    { resource: 'merchants', action: 'update' },
    { resource: 'merchants', action: 'delete' },
    { resource: 'api_keys', action: 'create' },
    { resource: 'api_keys', action: 'read' },
    { resource: 'api_keys', action: 'revoke' },
    { resource: 'psp_credentials', action: 'create' },
    { resource: 'psp_credentials', action: 'read' },
    { resource: 'psp_credentials', action: 'update' },
    { resource: 'audit_logs', action: 'read' },
  ];

  const permissions: PermissionEntity[] = [];
  for (const p of permissionData) {
    const perm = permissionRepo.create(p);
    permissions.push(await permissionRepo.save(perm));
  }

  // --- Roles ---
  const roleRepo = AppDataSource.getRepository(RoleEntity);

  const adminRole = roleRepo.create({
    name: 'admin',
    description: 'Full access to all resources',
    permissions: permissions,
  });
  await roleRepo.save(adminRole);

  const sessionCreatorPerms = permissions.filter(
    (p) => p.resource === 'sessions' || (p.resource === 'merchants' && p.action === 'read'),
  );
  const sessionCreatorRole = roleRepo.create({
    name: 'session_creator',
    description: 'Can create and read payment sessions',
    permissions: sessionCreatorPerms,
  });
  await roleRepo.save(sessionCreatorRole);

  const readonlyPerms = permissions.filter((p) => p.action === 'read');
  const readonlyRole = roleRepo.create({
    name: 'readonly',
    description: 'Read-only access to resources',
    permissions: readonlyPerms,
  });
  await roleRepo.save(readonlyRole);

  // --- Merchants ---
  const merchantRepo = AppDataSource.getRepository(MerchantEntity);

  const merchants = [
    merchantRepo.create({ name: 'Acme Corp', ruc: '20100100100', country_code: 'PE', status: 'active' }),
    merchantRepo.create({ name: 'MegaStore Inc', ruc: '30200200200', country_code: 'US', status: 'active' }),
  ];

  for (const m of merchants) {
    await merchantRepo.save(m);
  }

  // --- API Keys ---
  const apiKeyRepo = AppDataSource.getRepository(ApiKeyEntity);
  const plainKeys: { merchant: string; key: string }[] = [];

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

  // --- PSP Credentials ---
  const pspRepo = AppDataSource.getRepository(PspCredentialEntity);

  for (const m of merchants) {
    const psp = pspRepo.create({
      merchant_id: m.id,
      psp_name: 'cybersource',
      credential_ref: null,
      cybersource_merchant_id: process.env.CYBERSOURCE_MERCHANT_ID || 'YOUR_MERCHANT_ID',
      cybersource_key_id: process.env.CYBERSOURCE_KEY_ID || 'YOUR_KEY_ID',
      cybersource_secret_key: process.env.CYBERSOURCE_SECRET_KEY || 'YOUR_SECRET_KEY',
      is_active: true,
    });
    await pspRepo.save(psp);
  }

  console.log('\n✅ Seed completed successfully!\n');
  console.log('Generated API Keys (save these, they cannot be retrieved later):\n');
  for (const pk of plainKeys) {
    console.log(`  ${pk.merchant}: ${pk.key}`);
  }
  console.log('');

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
