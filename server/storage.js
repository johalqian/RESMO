import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
const storePath = path.join(dataDir, 'store.json');

const defaultState = () => ({
  users: [],
  products: [],
  plans: [],
  modules: [
    { name: '卫浴', id: 'bathroom' },
    { name: '净水', id: 'water' },
  ],
  categories: [],
});

const ensureDir = async () => {
  await fs.mkdir(dataDir, { recursive: true });
};

const safeParse = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

export const loadStore = async () => {
  await ensureDir();
  try {
    const raw = await fs.readFile(storePath, 'utf8');
    const parsed = safeParse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultState();
    return {
      ...defaultState(),
      ...parsed,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      modules: Array.isArray(parsed.modules) ? parsed.modules : defaultState().modules,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    };
  } catch {
    return defaultState();
  }
};

export const saveStore = async (store) => {
  await ensureDir();
  const payload = JSON.stringify(store, null, 2);
  await fs.writeFile(storePath, payload, 'utf8');
};

export const ensureAdmin = async () => {
  const store = await loadStore();
  const adminIndex = store.users.findIndex(
    (u) => String(u.username || '').trim().toLowerCase() === 'admin'
  );
  if (adminIndex >= 0) {
    const existing = store.users[adminIndex];
    const needsFix = !existing.passwordHash || existing.role !== 'admin';
    if (needsFix) {
      const passwordHash = existing.passwordHash || (await bcrypt.hash('admin', 10));
      store.users[adminIndex] = { ...existing, passwordHash, role: 'admin' };
      await saveStore(store);
    }
    return store;
  }

  const passwordHash = await bcrypt.hash('admin', 10);
  const adminUser = {
    id: crypto.randomUUID(),
    username: 'admin',
    passwordHash,
    role: 'admin',
    createTime: new Date().toLocaleDateString(),
  };
  const next = { ...store, users: [adminUser, ...store.users] };
  await saveStore(next);
  return next;
};

export const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  role: u.role,
  createTime: u.createTime,
});
