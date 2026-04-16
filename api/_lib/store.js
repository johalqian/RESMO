import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Redis } from '@upstash/redis';
import { gzipSync, gunzipSync } from 'zlib';

const LEGACY_STORE_KEY = 'resmo:store';
const STORE_KEYS = {
  users: 'resmo:store:users',
  products: 'resmo:store:products',
  plans: 'resmo:store:plans',
  modules: 'resmo:store:modules',
  categories: 'resmo:store:categories',
  timelines: 'resmo:store:timelines',
  notifications: 'resmo:store:notifications',
};
const GZIP_PREFIX = '__gz__:';

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
  timelines: [],
  notifications: [
    {
      id: 'mock-note-1',
      type: 'system',
      title: '系统升级通知',
      content: 'RESMO PMS V1.1.0 已发布，新增产品动态与通知中心，欢迎体验。',
      date: new Date().toISOString()
    },
    {
      id: 'mock-note-2',
      type: 'product',
      title: '产品规划上新',
      content: '【卫浴】模块新增了一个重点规划产品，请相关人员注意查看。',
      date: new Date(Date.now() - 86400000).toISOString()
    }
  ]
});

const encodeValue = (value) => {
  const raw = JSON.stringify(value);
  // Small payloads remain plain JSON for readability and compatibility
  if (raw.length < 12 * 1024) return raw;
  const gz = gzipSync(Buffer.from(raw, 'utf8'));
  return `${GZIP_PREFIX}${gz.toString('base64')}`;
};

const decodeValue = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;

  try {
    if (value.startsWith(GZIP_PREFIX)) {
      const b64 = value.slice(GZIP_PREFIX.length);
      const json = gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
      return JSON.parse(json);
    }
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  role: u.role,
  createTime: u.createTime,
  lastSeenVersion: u.lastSeenVersion,
  lastSeenTimelineTime: u.lastSeenTimelineTime,
  readNotifications: u.readNotifications || [],
});

export const loadStore = async () => {
  const redis = getRedis();
  const base = defaultState();
  const segmented = await Promise.all([
    redis.get(STORE_KEYS.users),
    redis.get(STORE_KEYS.products),
    redis.get(STORE_KEYS.plans),
    redis.get(STORE_KEYS.modules),
    redis.get(STORE_KEYS.categories),
    redis.get(STORE_KEYS.timelines),
    redis.get(STORE_KEYS.notifications),
  ]);
  const hasSegmentedData = segmented.some((v) => v !== null && v !== undefined);

  if (hasSegmentedData) {
    const [usersRaw, productsRaw, plansRaw, modulesRaw, categoriesRaw, timelinesRaw, notificationsRaw] = segmented;
    const users = decodeValue(usersRaw, []);
    const products = decodeValue(productsRaw, []);
    const plans = decodeValue(plansRaw, []);
    const modules = decodeValue(modulesRaw, []);
    const categories = decodeValue(categoriesRaw, []);
    const timelines = decodeValue(timelinesRaw, []);
    const notifications = decodeValue(notificationsRaw, base.notifications);

    return {
      ...base,
      users: Array.isArray(users) ? users : [],
      products: Array.isArray(products) ? products : [],
      plans: Array.isArray(plans) ? plans : [],
      modules: Array.isArray(modules) && modules.length > 0 ? modules : base.modules,
      categories: Array.isArray(categories) ? categories : [],
      timelines: Array.isArray(timelines) ? timelines : [],
      notifications: Array.isArray(notifications) && notifications.length > 0 ? notifications : base.notifications,
    };
  }

  let stored = await redis.get(LEGACY_STORE_KEY);

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
    timelines: Array.isArray(stored.timelines) ? stored.timelines : [],
    notifications: Array.isArray(stored.notifications) && stored.notifications.length > 0 ? stored.notifications : base.notifications,
  };
};

export const saveStore = async (store) => {
  const redis = getRedis();
  const payload = {
    users: Array.isArray(store.users) ? store.users : [],
    products: Array.isArray(store.products) ? store.products : [],
    plans: Array.isArray(store.plans) ? store.plans : [],
    modules: Array.isArray(store.modules) ? store.modules : [],
    categories: Array.isArray(store.categories) ? store.categories : [],
    timelines: Array.isArray(store.timelines) ? store.timelines : [],
    notifications: Array.isArray(store.notifications) ? store.notifications : [],
  };

  await Promise.all([
    redis.set(STORE_KEYS.users, encodeValue(payload.users)),
    redis.set(STORE_KEYS.products, encodeValue(payload.products)),
    redis.set(STORE_KEYS.plans, encodeValue(payload.plans)),
    redis.set(STORE_KEYS.modules, encodeValue(payload.modules)),
    redis.set(STORE_KEYS.categories, encodeValue(payload.categories)),
    redis.set(STORE_KEYS.timelines, encodeValue(payload.timelines)),
    redis.set(STORE_KEYS.notifications, encodeValue(payload.notifications)),
  ]);
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
