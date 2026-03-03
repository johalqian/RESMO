import bcrypt from 'bcryptjs';
import { readJson, sendJson, methodNotAllowed } from '../_lib/http.js';
import { getAuthUser } from '../_lib/auth.js';
import { ensureAdmin, loadStore, saveStore, publicUser } from '../_lib/store.js';

export default async function handler(req, res) {
  const auth = getAuthUser(req);
  if (!auth) return sendJson(res, 401, { message: 'unauthorized' });
  if (auth.role !== 'admin') return sendJson(res, 403, { message: 'forbidden' });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.pathname.split('/').pop();
  if (!id) return sendJson(res, 400, { message: 'bad_request' });

  if (req.method === 'PUT') {
    let body;
    try {
      body = await readJson(req);
    } catch {
      return sendJson(res, 400, { message: 'bad_request' });
    }

    let store = await loadStore();
    store = await ensureAdmin(store);
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx < 0) return sendJson(res, 404, { message: 'not_found' });

    const username = body.username !== undefined ? String(body.username).trim() : undefined;
    const password = body.password !== undefined ? String(body.password).trim() : undefined;
    const role = body.role;

    if (username) {
      const exists = store.users.some(
        (u) => u.id !== id && String(u.username || '').trim().toLowerCase() === username.toLowerCase()
      );
      if (exists) return sendJson(res, 409, { message: 'username_exists' });
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

    await saveStore(store);
    return sendJson(res, 200, { user: publicUser(store.users[idx]) });
  }

  if (req.method === 'DELETE') {
    let store = await loadStore();
    store = await ensureAdmin(store);
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx < 0) return sendJson(res, 404, { message: 'not_found' });

    const target = store.users[idx];
    if (String(target.username || '').trim().toLowerCase() === 'admin') {
      return sendJson(res, 400, { message: 'cannot_delete_admin' });
    }

    store.users.splice(idx, 1);
    await saveStore(store);
    return sendJson(res, 200, { ok: true });
  }

  return methodNotAllowed(res);
}

