const { createECDH } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('dotenv');
const root = path.resolve(__dirname, '..');
const ecdh = createECDH('prime256v1');
ecdh.generateKeys();
const values = {
  VAPID_PUBLIC_KEY: ecdh.getPublicKey().toString('base64url'),
  VAPID_PRIVATE_KEY: Buffer.from(ecdh.getPrivateKey().toString('hex').padStart(64, '0'), 'hex').toString('base64url'),
  VAPID_SUBJECT: 'mailto:admin@localhost',
};
if (process.argv.includes('--write-dev')) {
  const files = ['apps/api', 'apps/worker'].map((app) => path.join(root, app, '.env.local'));
  for (const app of ['apps/api', 'apps/worker']) {
    const config = {};
    for (const name of ['.env', '.env.local']) {
      const file = path.join(root, app, name);
      if (fs.existsSync(file)) Object.assign(config, parse(fs.readFileSync(file)));
    }
    if (config.NODE_ENV === 'production' || config.CLERK_SECRET_KEY?.startsWith('sk_live_')) throw new Error('Refusing to write development keys into a production environment.');
    if (Object.keys(values).some((key) => config[key])) throw new Error('VAPID settings already exist; preserve the configured pair.');
  }
  for (const file of files) {
    fs.appendFileSync(file, '\n# Development browser push keys (shared by API and worker)\n' + Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 });
    fs.chmodSync(file, 0o600);
  }
  console.log('Development push keys saved in API and worker .env.local files. No keys were printed. Restart both processes.');
} else {
  values.VAPID_SUBJECT = 'mailto:admin@YOUR_DOMAIN';
  console.log(Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n'));
}
