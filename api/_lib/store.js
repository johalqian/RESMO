import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Redis } from '@upstash/redis';

const STORE_KEY = 'resmo:store';

const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error('storage_not_configured');
  }
  return new Redis({
    url,
    token,
  });
};

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

export const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  role: u.role,
  createTime: u.createTime,
});

export const loadStore = async () => {
  const redis = getRedis();
  let stored = await redis.get(STORE_KEY);
  const base = defaultState();

  // Handle potential string return from Redis (e.g. from some client wrappers)
  if (typeof stored === 'string') {
    try {
      stored = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored JSON', e);
      stored = null;
    }
  }

  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    ...stored,
    users: Array.isArray(stored.users) ? stored.users : [],
    products: Array.isArray(stored.products) ? stored.products : [],
    plans: Array.isArray(stored.plans) ? stored.plans : [],
    // Only use base modules if stored modules is missing or empty
    modules: Array.isArray(stored.modules) && stored.modules.length > 0 ? stored.modules : base.modules,
    categories: Array.isArray(stored.categories) ? stored.categories : [],
  };
};

export const saveStore = async (store) => {
  const redis = getRedis();
  await redis.set(STORE_KEY, store);
};

export const ensureAdmin = async (store) => {
  const idx = store.users.findIndex(
    (u) => String(u.username || '').trim().toLowerCase() === 'admin'
  );

  if (idx >= 0) {
    const existing = store.users[idx];
    if (!existing.passwordHash || existing.role !== 'admin') {
      const passwordHash = existing.passwordHash || (await bcrypt.hash('admin', 10));
      store.users[idx] = { ...existing, passwordHash, role: 'admin', username: 'admin' };
    }
    return store;
  }

  const passwordHash = await bcrypt.hash('admin', 10);
  store.users.unshift({
    id: crypto.randomUUID(),
    username: 'admin',
    role: 'admin',
    passwordHash,
    createTime: new Date().toLocaleDateString(),
  });
  return store;
};
