import { sendJson, readJson, methodNotAllowed } from '../_lib/http.js';
import { getAuthUser } from '../_lib/auth.js';
import { ensureAdmin, loadStore, saveStore } from '../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  const auth = getAuthUser(req);
  if (!auth) return sendJson(res, 401, { message: 'unauthorized' });
  if (auth.role !== 'admin' && auth.role !== 'editor') {
    return sendJson(res, 403, { message: 'forbidden' });
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { message: 'bad_request' });
  }

  const planId = String(body?.planId || '').trim();
  const product = body?.product;

  if (!planId || !product || typeof product !== 'object') {
    return sendJson(res, 400, { message: 'invalid_payload' });
  }

  let store = await loadStore();
  store = await ensureAdmin(store);

  const safePlans = Array.isArray(store.plans) ? store.plans : [];
  const planExists = safePlans.some((p) => String(p.id) === planId);
  if (!planExists) {
    return sendJson(res, 404, { message: 'plan_not_found' });
  }

  store.plans = safePlans.filter((p) => String(p.id) !== planId);
  store.products = [product, ...(Array.isArray(store.products) ? store.products : [])];

  await saveStore(store);

  return sendJson(res, 200, {
    ok: true,
    products: store.products,
    plans: store.plans,
  });
}
