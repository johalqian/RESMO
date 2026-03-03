import { sendJson, methodNotAllowed } from '../_lib/http.js';
import { getAuthUser } from '../_lib/auth.js';
import { ensureAdmin, loadStore, saveStore, publicUser } from '../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  const auth = getAuthUser(req);
  if (!auth) return sendJson(res, 401, { message: 'unauthorized' });

  let store = await loadStore();
  store = await ensureAdmin(store);
  await saveStore(store);

  const user = store.users.find((u) => u.id === auth.sub);
  if (!user) return sendJson(res, 401, { message: 'unauthorized' });
  return sendJson(res, 200, { user: publicUser(user) });
}

