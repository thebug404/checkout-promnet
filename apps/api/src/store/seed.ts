// @ts-nocheck
import { randomUUID } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashApiKey, generateApiKey } from '../utils/crypto.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function write(name, data) {
  writeFileSync(join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf-8');
}

// --- Roles ---
const roles = [
  { id: randomUUID(), name: 'admin', description: 'Full access to all resources' },
  { id: randomUUID(), name: 'session_creator', description: 'Can create and read payment sessions' },
  { id: randomUUID(), name: 'readonly', description: 'Read-only access to resources' },
];

// --- Permissions ---
const permissions = [
  { id: randomUUID(), resource: 'sessions', action: 'create' },
  { id: randomUUID(), resource: 'sessions', action: 'read' },
  { id: randomUUID(), resource: 'merchants', action: 'create' },
  { id: randomUUID(), resource: 'merchants', action: 'read' },
  { id: randomUUID(), resource: 'merchants', action: 'update' },
  { id: randomUUID(), resource: 'merchants', action: 'delete' },
  { id: randomUUID(), resource: 'api_keys', action: 'create' },
  { id: randomUUID(), resource: 'api_keys', action: 'read' },
  { id: randomUUID(), resource: 'api_keys', action: 'revoke' },
  { id: randomUUID(), resource: 'psp_credentials', action: 'create' },
  { id: randomUUID(), resource: 'psp_credentials', action: 'read' },
  { id: randomUUID(), resource: 'psp_credentials', action: 'update' },
  { id: randomUUID(), resource: 'audit_logs', action: 'read' },
];

// --- Role Permissions ---
const adminRole = roles.find((r) => r.name === 'admin');
const sessionCreatorRole = roles.find((r) => r.name === 'session_creator');
const readonlyRole = roles.find((r) => r.name === 'readonly');

const rolePermissions = [];

// Admin gets all permissions
for (const perm of permissions) {
  rolePermissions.push({ role_id: adminRole.id, permission_id: perm.id });
}

// Session creator gets session create/read + merchant read
const sessionCreatorPerms = permissions.filter(
  (p) =>
    (p.resource === 'sessions') ||
    (p.resource === 'merchants' && p.action === 'read')
);
for (const perm of sessionCreatorPerms) {
  rolePermissions.push({ role_id: sessionCreatorRole.id, permission_id: perm.id });
}

// Readonly gets all read permissions
const readonlyPerms = permissions.filter((p) => p.action === 'read');
for (const perm of readonlyPerms) {
  rolePermissions.push({ role_id: readonlyRole.id, permission_id: perm.id });
}

// --- Merchants ---
const merchants = [
  {
    id: randomUUID(),
    name: 'Acme Corp',
    ruc: '20100100100',
    country_code: 'PE',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    name: 'MegaStore Inc',
    ruc: '30200200200',
    country_code: 'US',
    status: 'active',
    created_at: new Date().toISOString(),
  },
];

// --- API Keys ---
const apiKeys = [];
const plainKeys = [];

for (const merchant of merchants) {
  const { raw, prefix } = generateApiKey();
  const keyHash = hashApiKey(raw);

  const apiKey = {
    id: randomUUID(),
    merchant_id: merchant.id,
    role_id: adminRole.id,
    key_prefix: prefix,
    key_hash: keyHash,
    allowed_origins: ['https://localhost:8181', 'https://localhost:3000', 'https://localhost:5173'],
    ip_whitelist: [],
    is_active: true,
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    last_used_at: null,
    created_at: new Date().toISOString(),
    created_by: 'system',
  };

  apiKeys.push(apiKey);
  plainKeys.push({ merchant: merchant.name, key: raw });
}

// --- PSP Credentials ---
// Replace these with your real CyberSource sandbox credentials
const pspCredentials = merchants.map((m) => ({
  id: randomUUID(),
  merchant_id: m.id,
  psp_name: 'cybersource',
  credential_ref: null,
  cybersource_merchant_id: process.env.CYBERSOURCE_MERCHANT_ID || 'YOUR_MERCHANT_ID',
  cybersource_key_id: process.env.CYBERSOURCE_KEY_ID || 'YOUR_KEY_ID',
  cybersource_secret_key: process.env.CYBERSOURCE_SECRET_KEY || 'YOUR_SECRET_KEY',
  is_active: true,
  created_at: new Date().toISOString(),
}));

// --- Write all ---
write('merchants', merchants);
write('api_keys', apiKeys);
write('roles', roles);
write('permissions', permissions);
write('role_permissions', rolePermissions);
write('merchant_psp_credentials', pspCredentials);
write('audit_logs', []);
write('sessions', []);

console.log('\n✅ Seed completed successfully!\n');
console.log('Generated API Keys (save these, they cannot be retrieved later):\n');
for (const pk of plainKeys) {
  console.log(`  ${pk.merchant}: ${pk.key}`);
}
console.log('');
