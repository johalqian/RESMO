import { sendJson, methodNotAllowed } from '../_lib/http.js';
import { getAuthUser } from '../_lib/auth.js';
import { ensureAdmin, loadStore, saveStore, publicUser } from '../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  const auth = getAuthUser(req);
  if (!auth) return sendJson(res, 401, { message: 'unauthorized' });

  let store = await loadStore();
  store = await ensureAdmin(store);
  // Do NOT saveStore here. This is a read-only operation.
  // Saving here risks overwriting data with default state if loadStore fails/returns partial data.
  // ensureAdmin modifies the in-memory store object to ensure admin exists for the check,
  // but we don't need to persist it every time /me is called.
  
  const user = store.users.find((u) => u.id === auth.sub);
  if (!user) return sendJson(res, 401, { message: 'unauthorized' });
  return sendJson(res, 200, { user: publicUser(user) });
}

