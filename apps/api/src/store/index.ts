import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(collection: string) {
  return join(DATA_DIR, `${collection}.json`);
}

function readCollection(collection: string): Record<string, unknown>[] {
  const filePath = getFilePath(collection);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function writeCollection(collection: string, data: unknown[]) {
  writeFileSync(getFilePath(collection), JSON.stringify(data, null, 2), 'utf-8');
}

export function findAll(collection: string) {
  return readCollection(collection);
}

export function findById(collection: string, id: string) {
  return readCollection(collection).find((item) => item['id'] === id) ?? null;
}

export function findOne(collection: string, predicate: (item: Record<string, unknown>) => boolean) {
  return readCollection(collection).find(predicate) ?? null;
}

export function findMany(collection: string, predicate: (item: Record<string, unknown>) => boolean) {
  return readCollection(collection).filter(predicate);
}

export function create(collection: string, item: Record<string, unknown>) {
  const data = readCollection(collection);
  data.push(item);
  writeCollection(collection, data);
  return item;
}

export function update(collection: string, id: string, updates: Record<string, unknown>) {
  const data = readCollection(collection);
  const index = data.findIndex((item) => item['id'] === id);
  if (index === -1) return null;
  data[index] = { ...data[index], ...updates };
  writeCollection(collection, data);
  return data[index];
}

export function remove(collection: string, id: string) {
  const data = readCollection(collection);
  const index = data.findIndex((item) => item['id'] === id);
  if (index === -1) return false;
  data.splice(index, 1);
  writeCollection(collection, data);
  return true;
}
