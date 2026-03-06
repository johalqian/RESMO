import { readJson, sendJson, methodNotAllowed } from '../_lib/http.js';
import { getAuthUser } from '../_lib/auth.js';
import { ensureAdmin, loadStore, saveStore } from '../_lib/store.js';

export default async function handler(req, res) {
  const auth = getAuthUser(req);
  if (!auth) return sendJson(res, 401, { message: 'unauthorized' });

  if (req.method === 'GET') {
    // Disable Vercel caching for API responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    let store = await loadStore();
    // Only ensure admin exists, do NOT save state on GET requests
    // This prevents race conditions or overwriting data with defaults on load
    store = await ensureAdmin(store);
    
    return sendJson(res, 200, {
      products: store.products,
      plans: store.plans,
      modules: store.modules,
      categories: store.categories,
    });
  }

  if (req.method === 'PUT') {
    if (auth.role !== 'admin' && auth.role !== 'editor') {
      return sendJson(res, 403, { message: 'forbidden' });
    }

    let body;
    try {
      body = await readJson(req);
    } catch {
      return sendJson(res, 400, { message: 'bad_request' });
    }

    let store = await loadStore();
    store = await ensureAdmin(store);

    // Merge logic: Only update fields that are present in the body
    // If body.plans is NOT provided, keep store.plans as is.
    // If body.plans IS provided, update it.
    
    // NOTE: The previous logic ALREADY did this:
    // store.plans = Array.isArray(body.plans) ? body.plans : store.plans;
    // This means if body.plans is undefined, it keeps store.plans.
    // BUT, if body.plans is an EMPTY ARRAY [], it overwrites store.plans with [].
    
    // The issue might be that the frontend sends [] when it thinks it has no plans (e.g. initial load race condition).
    // But we fixed the frontend to use functional updates.
    
    // Let's add server-side logging to debug what exactly is being received.
    console.log('PUT /api/state received body keys:', Object.keys(body));
    if (body.plans) console.log('Received plans count:', body.plans.length);
    
    // CRITICAL FIX: If the frontend sends an empty array, is it intentional (user deleted all) or accidental?
    // We can't know for sure. But "disappearing" usually means accidental.
    // However, if we block empty arrays, users can't delete the last item.
    
    // Let's look at the store logic again.
    // Maybe loadStore() is returning default state because of Redis connection issues?
    
    store.products = Array.isArray(body.products) ? body.products : store.products;
    store.plans = Array.isArray(body.plans) ? body.plans : store.plans;
    store.modules = Array.isArray(body.modules) ? body.modules : store.modules;
    store.categories = Array.isArray(body.categories) ? body.categories : store.categories;

    await saveStore(store);
    
    // Verify persistence immediately
    // const verify = await loadStore();
    // console.log('Verified persistence plans count:', verify.plans.length);
    
    return sendJson(res, 200, { ok: true });
  }

  return methodNotAllowed(res);
}

