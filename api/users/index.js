import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { readJson, sendJson, methodNotAllowed } from '../_lib/http.js';
import { getAuthUser } from '../_lib/auth.js';
import { ensureAdmin, loadStore, saveStore, publicUser } from '../_lib/store.js';

export default async function handler(req, res) {
  const auth = getAuthUser(req);
  if (!auth) return sendJson(res, 401, { message: 'unauthorized' });
  if (auth.role !== 'admin') return sendJson(res, 403, { message: 'forbidden' });

  if (req.method === 'GET') {
    let store = await loadStore();
    store = await ensureAdmin(store);
    await saveStore(store);
    return sendJson(res, 200, { users: store.users.map(publicUser) });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await readJson(req);
    } catch {
      return sendJson(res, 400, { message: 'bad_request' });
    }
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    const role = body.role === 'admin' || body.role === 'editor' ? body.role : 'viewer';
    if (!username || !password) return sendJson(res, 400, { message: 'bad_request' });

    let store = await loadStore();
    store = await ensureAdmin(store);

    const exists = store.users.some(
      (u) => String(u.username || '').trim().toLowerCase() === username.toLowerCase()
    );
    if (exists) return sendJson(res, 409, { message: 'username_exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: crypto.randomUUID(),
      username,
      role,
      passwordHash,
      createTime: new Date().toLocaleDateString(),
    };
    store.users.push(user);
    await saveStore(store);
    return sendJson(res, 200, { user: publicUser(user) });
  }

  return methodNotAllowed(res);
}

