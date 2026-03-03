import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loadStore, saveStore } from './storage.js';

const password = process.argv[2] ? String(process.argv[2]) : 'admin';

const main = async () => {
  const store = await loadStore();
  const passwordHash = await bcrypt.hash(password, 10);

  const idx = store.users.findIndex(
    (u) => String(u.username || '').trim().toLowerCase() === 'admin'
  );

  if (idx >= 0) {
    store.users[idx] = {
      ...store.users[idx],
      username: 'admin',
      role: 'admin',
      passwordHash,
      createTime: store.users[idx].createTime || new Date().toLocaleDateString(),
    };
  } else {
    store.users.unshift({
      id: crypto.randomUUID(),
      username: 'admin',
      role: 'admin',
      passwordHash,
      createTime: new Date().toLocaleDateString(),
    });
  }

  await saveStore(store);
  process.stdout.write('admin 已重置\n');
};

main().catch((e) => {
  process.stderr.write(String(e?.stack || e) + '\n');
  process.exit(1);
});

