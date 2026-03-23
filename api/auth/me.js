import bcrypt from 'bcryptjs';
import { sendJson, readJson, methodNotAllowed } from '../_lib/http.js';
import { getAuthUser } from '../_lib/auth.js';
import { ensureAdmin, loadStore, saveStore, publicUser } from '../_lib/store.js';

export default async function handler(req, res) {
  const auth = getAuthUser(req);
  if (!auth) return sendJson(res, 401, { message: 'unauthorized' });

  if (req.method === 'GET') {
    let store = await loadStore();
    store = await ensureAdmin(store);
    const user = store.users.find((u) => u.id === auth.sub);
    if (!user) return sendJson(res, 401, { message: 'unauthorized' });
    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (req.method === 'PUT') {
    let body;
    try {
      body = await readJson(req);
    } catch {
      return sendJson(res, 400, { message: 'bad_request' });
    }

    let store = await loadStore();
    store = await ensureAdmin(store);
    const idx = store.users.findIndex((u) => u.id === auth.sub);
    if (idx < 0) return sendJson(res, 404, { message: 'not_found' });

    if (body.lastSeenVersion !== undefined) {
      store.users[idx].lastSeenVersion = body.lastSeenVersion;
    }
    
    if (Array.isArray(body.readNotifications)) {
      store.users[idx].readNotifications = body.readNotifications;
    }

    if (body.oldPassword && body.newPassword) {
      const match = await bcrypt.compare(body.oldPassword, store.users[idx].passwordHash);
      if (!match) {
        return sendJson(res, 400, { message: 'invalid_old_password' });
      }
      store.users[idx].passwordHash = await bcrypt.hash(body.newPassword, 10);
    }

    await saveStore(store);
    return sendJson(res, 200, { user: publicUser(store.users[idx]) });
  }

  return methodNotAllowed(res);
}

