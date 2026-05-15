import { readJson, sendJson, methodNotAllowed } from '../_lib/http.js';
import { getAuthUser } from '../_lib/auth.js';
import { ensureAdmin, loadStore, saveStore } from '../_lib/store.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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
      timelines: store.timelines,
      notifications: store.notifications || [],
    });
  }

  if (req.method === 'PUT') {
    try {
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

    if (body.action) {
      const { action, payload } = body;
      switch (action) {
        case 'addProduct':
          store.products.unshift(payload);
          break;
        case 'addProducts':
          store.products.unshift(...payload);
          break;
        case 'updateProduct':
          store.products = store.products.map(p => p.key === payload.key ? payload : p);
          break;
        case 'deleteProduct':
          store.products = store.products.filter(p => p.key !== payload);
          break;
        case 'addPlan':
          store.plans.unshift(payload);
          break;
        case 'addPlans':
          store.plans.unshift(...payload);
          break;
        case 'updatePlan':
          store.plans = store.plans.map(p => p.id === payload.id ? payload : p);
          break;
        case 'deletePlan':
          store.plans = store.plans.filter(p => p.id !== payload);
          break;
        case 'addModule':
          store.modules.push(payload);
          break;
        case 'deleteModule':
          store.modules = store.modules.filter(m => m.name !== payload);
          store.categories = store.categories.filter(c => c.module !== payload);
          break;
        case 'addCategory':
          store.categories.push(payload);
          break;
        case 'updateCategory':
          store.categories = store.categories.map(c =>
            c.module === payload.oldModule && c.name === payload.oldName
              ? { ...c, module: payload.newModule, name: payload.newName }
              : c
          );
          break;
        case 'deleteCategory':
          store.categories = store.categories.filter(c =>
            !(c.module === payload.moduleName && c.name === payload.categoryName)
          );
          break;
        case 'addTimeline':
          store.timelines.unshift(payload);
          break;
        case 'updateTimeline':
          store.timelines = store.timelines.map(t => t.id === payload.id ? payload : t);
          break;
        case 'deleteTimeline':
          store.timelines = store.timelines.filter(t => t.id !== payload);
          break;
        case 'addNotification':
          store.notifications.unshift(payload);
          break;
        case 'clearNotifications':
          store.notifications = [];
          break;
      }
    } else {
      store.products = Array.isArray(body.products) ? body.products : store.products;
      store.plans = Array.isArray(body.plans) ? body.plans : store.plans;
      store.modules = Array.isArray(body.modules) ? body.modules : store.modules;
      store.categories = Array.isArray(body.categories) ? body.categories : store.categories;
      store.timelines = Array.isArray(body.timelines) ? body.timelines : store.timelines || [];
      store.notifications = Array.isArray(body.notifications) ? body.notifications : store.notifications || [];
    }

    await saveStore(store);
    
    return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error('PUT Error:', err);
      return sendJson(res, 500, { message: err.message, stack: err.stack });
    }
  }

  return methodNotAllowed(res);
}
