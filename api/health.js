import { sendJson } from './_lib/http.js';
import { loadStore } from './_lib/store.js';

export default async function handler(req, res) {
  try {
    await loadStore();
    sendJson(res, 200, { ok: true, storage: true });
  } catch (e) {
    sendJson(res, 500, { ok: false, storage: false, message: e?.message || 'health_failed' });
  }
}
