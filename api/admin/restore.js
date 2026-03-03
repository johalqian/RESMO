import { readJson, sendJson, methodNotAllowed } from '../_lib/http.js';
import { getAuthUser } from '../_lib/auth.js';
import { ensureAdmin, loadStore, saveStore } from '../_lib/store.js';

export default async function handler(req, res) {
  const auth = getAuthUser(req);
  if (!auth) return sendJson(res, 401, { message: 'unauthorized' });
  if (auth.role !== 'admin') return sendJson(res, 403, { message: 'forbidden' });

  if (req.method !== 'PUT') return methodNotAllowed(res);

  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { message: 'bad_request' });
  }

  let store = await loadStore();
  store = await ensureAdmin(store);

  store.products = Array.isArray(body.products) ? body.products : store.products;
  store.plans = Array.isArray(body.plans) ? body.plans : store.plans;
  store.modules = Array.isArray(body.modules) ? body.modules : store.modules;
  store.categories = Array.isArray(body.categories) ? body.categories : store.categories;

  await saveStore(store);
  return sendJson(res, 200, { ok: true });
}

