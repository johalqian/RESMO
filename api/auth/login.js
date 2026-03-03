import bcrypt from 'bcryptjs';
import { readJson, sendJson, methodNotAllowed } from '../_lib/http.js';
import { signToken } from '../_lib/auth.js';
import { ensureAdmin, loadStore, saveStore, publicUser } from '../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { message: 'bad_request' });
  }

  const username = String(body.username || '').trim();
  const password = String(body.password || '').trim();
  if (!username || !password) return sendJson(res, 400, { message: 'bad_request' });

  let store = await loadStore();
  store = await ensureAdmin(store);
  await saveStore(store);

  const user = store.users.find(
    (u) => String(u.username || '').trim().toLowerCase() === username.toLowerCase()
  );
  if (!user) return sendJson(res, 401, { message: 'invalid_credentials' });
  if (!user.passwordHash) return sendJson(res, 401, { message: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return sendJson(res, 401, { message: 'invalid_credentials' });

  const token = signToken(user);
  return sendJson(res, 200, { token, user: publicUser(user) });
}

