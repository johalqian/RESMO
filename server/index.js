import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authRequired, adminRequired, signToken } from './auth.js';
import { ensureAdmin, loadStore, saveStore, publicUser } from './storage.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

let store = await ensureAdmin();

const reloadStore = async () => {
  store = await loadStore();
  store = await ensureAdmin();
};

const persist = async () => {
  await saveStore(store);
};

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '').trim();
  if (!username || !password) return res.status(400).json({ message: 'bad_request' });

  await reloadStore();
  const user = store.users.find(
    (u) => String(u.username || '').trim().toLowerCase() === username.toLowerCase()
  );
  if (!user) return res.status(401).json({ message: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'invalid_credentials' });

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  await reloadStore();
  const user = store.users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(401).json({ message: 'unauthorized' });
  res.json({ user: publicUser(user) });
});

app.get('/api/state', authRequired, async (req, res) => {
  await reloadStore();
  res.json({
    products: store.products,
    plans: store.plans,
    modules: store.modules,
    categories: store.categories,
    deliveryData: store.deliveryData,
  });
});

app.put('/api/state', authRequired, async (req, res) => {
  await reloadStore();
  const role = req.user.role;
  if (role !== 'admin' && role !== 'editor') {
    return res.status(403).json({ message: 'forbidden' });
  }
  const body = req.body || {};
  store.products = Array.isArray(body.products) ? body.products : store.products;
  store.plans = Array.isArray(body.plans) ? body.plans : store.plans;
  store.modules = Array.isArray(body.modules) ? body.modules : store.modules;
  store.categories = Array.isArray(body.categories) ? body.categories : store.categories;
  store.deliveryData = Array.isArray(body.deliveryData) ? body.deliveryData : store.deliveryData;
  await persist();
  res.json({ ok: true });
});

app.get('/api/users', authRequired, adminRequired, async (req, res) => {
  await reloadStore();
  res.json({ users: store.users.map(publicUser) });
});

app.post('/api/users', authRequired, adminRequired, async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '').trim();
  const role = req.body?.role === 'admin' || req.body?.role === 'editor' ? req.body.role : 'viewer';
  if (!username || !password) return res.status(400).json({ message: 'bad_request' });

  await reloadStore();
  const exists = store.users.some(
    (u) => String(u.username || '').trim().toLowerCase() === username.toLowerCase()
  );
  if (exists) return res.status(409).json({ message: 'username_exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    username,
    passwordHash,
    role,
    createTime: new Date().toLocaleDateString(),
  };
  store.users.push(user);
  await persist();
  res.json({ user: publicUser(user) });
});

// Delivery Data Endpoints
app.get('/api/delivery', authRequired, async (req, res) => {
  await reloadStore();
  const { startDate, endDate } = req.query;
  let data = store.deliveryData || [];

  if (startDate || endDate) {
    data = data.filter((item) => {
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;
      return true;
    });
  }

  // Sort by date descending by default
  data.sort((a, b) => (a.date > b.date ? -1 : 1));
  res.json({ data });
});

app.post('/api/delivery', authRequired, async (req, res) => {
  await reloadStore();
  const role = req.user.role;
  if (role !== 'admin' && role !== 'editor') {
    return res.status(403).json({ message: 'forbidden' });
  }

  const items = Array.isArray(req.body) ? req.body : [req.body];
  
  // Use a map for existing data for O(1) lookup
  const existingMap = new Map((store.deliveryData || []).map(item => [item.date, item]));
  const processedItems = [];

  for (const item of items) {
    if (!item.date) continue; // Skip invalid items

    if (existingMap.has(item.date)) {
      // Update existing
      const existing = existingMap.get(item.date);
      const updated = {
        ...existing,
        ...item,
        id: existing.id, // Keep original ID
        updateTime: new Date().toISOString(),
        updatedBy: req.user.username,
      };
      existingMap.set(item.date, updated);
      processedItems.push(updated);
    } else {
      // Create new
      const newItem = {
        ...item,
        id: crypto.randomUUID(),
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        createdBy: req.user.username,
      };
      existingMap.set(item.date, newItem);
      processedItems.push(newItem);
    }
  }

  // Convert map back to array
  store.deliveryData = Array.from(existingMap.values());
  
  // Sort by date
  store.deliveryData.sort((a, b) => (a.date > b.date ? -1 : 1));

  await persist();
  res.json({ data: processedItems });
});

app.put('/api/delivery/:id', authRequired, async (req, res) => {
  await reloadStore();
  const role = req.user.role;
  if (role !== 'admin' && role !== 'editor') {
    return res.status(403).json({ message: 'forbidden' });
  }

  const id = req.params.id;
  const idx = (store.deliveryData || []).findIndex((item) => item.id === id);
  if (idx < 0) return res.status(404).json({ message: 'not_found' });

  store.deliveryData[idx] = {
    ...store.deliveryData[idx],
    ...req.body,
    id, // Ensure ID doesn't change
    updateTime: new Date().toISOString(),
    updatedBy: req.user.username,
  };

  await persist();
  res.json({ data: store.deliveryData[idx] });
});

app.delete('/api/delivery/:id', authRequired, async (req, res) => {
  await reloadStore();
  const role = req.user.role;
  if (role !== 'admin' && role !== 'editor') {
    return res.status(403).json({ message: 'forbidden' });
  }

  const id = req.params.id;
  const initialLength = (store.deliveryData || []).length;
  store.deliveryData = (store.deliveryData || []).filter((item) => item.id !== id);
  
  if (store.deliveryData.length === initialLength) {
    return res.status(404).json({ message: 'not_found' });
  }

  await persist();
  res.json({ ok: true });
});

app.put('/api/users/:id', authRequired, adminRequired, async (req, res) => {
  const id = req.params.id;
  await reloadStore();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx < 0) return res.status(404).json({ message: 'not_found' });

  const username = req.body?.username !== undefined ? String(req.body.username).trim() : undefined;
  const password = req.body?.password !== undefined ? String(req.body.password).trim() : undefined;
  const role = req.body?.role;

  if (username) {
    const exists = store.users.some(
      (u) => u.id !== id && String(u.username || '').trim().toLowerCase() === username.toLowerCase()
    );
    if (exists) return res.status(409).json({ message: 'username_exists' });
    store.users[idx].username = username;
  }

  if (password) {
    store.users[idx].passwordHash = await bcrypt.hash(password, 10);
  }

  if (role === 'admin' || role === 'editor' || role === 'viewer') {
    if (String(store.users[idx].username || '').trim().toLowerCase() === 'admin') {
      store.users[idx].role = 'admin';
    } else {
      store.users[idx].role = role;
    }
  }

  await persist();
  res.json({ user: publicUser(store.users[idx]) });
});

app.delete('/api/users/:id', authRequired, adminRequired, async (req, res) => {
  const id = req.params.id;
  await reloadStore();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx < 0) return res.status(404).json({ message: 'not_found' });

  const target = store.users[idx];
  if (String(target.username || '').trim().toLowerCase() === 'admin') {
    return res.status(400).json({ message: 'cannot_delete_admin' });
  }

  store.users.splice(idx, 1);
  await persist();
  res.json({ ok: true });
});

app.put('/api/admin/restore', authRequired, adminRequired, async (req, res) => {
  await reloadStore();
  const body = req.body || {};

  store.products = Array.isArray(body.products) ? body.products : store.products;
  store.plans = Array.isArray(body.plans) ? body.plans : store.plans;
  store.modules = Array.isArray(body.modules) ? body.modules : store.modules;
  store.categories = Array.isArray(body.categories) ? body.categories : store.categories;
  store.deliveryData = Array.isArray(body.deliveryData) ? body.deliveryData : store.deliveryData;

  if (Array.isArray(body.users)) {
    const incoming = body.users
      .filter((u) => u && typeof u === 'object')
      .map((u) => ({
        id: u.id || crypto.randomUUID(),
        username: String(u.username || '').trim(),
        role: u.role === 'admin' || u.role === 'editor' ? u.role : 'viewer',
        createTime: u.createTime || new Date().toLocaleDateString(),
        passwordHash: u.passwordHash,
      }))
      .filter((u) => u.username);

    const admin = store.users.find(
      (u) => String(u.username || '').trim().toLowerCase() === 'admin'
    );

    store.users = incoming.filter((u) => String(u.username).toLowerCase() !== 'admin');
    if (admin) store.users.unshift(admin);
  }

  await persist();
  res.json({ ok: true });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const port = Number(process.env.RESMO_SERVER_PORT || 5174);
app.listen(port, () => {
  process.stdout.write(`RESMO server listening on http://localhost:${port}\n`);
});
