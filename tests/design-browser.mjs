// Isolated, disposable fixture for manual/browser verification. Never uses the app database.
import { MongoClient } from 'mongodb';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
import { spawn } from 'node:child_process';
const dbName = `test_design_browser_${Date.now()}`;
const mongo = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017');
await mongo.connect();
const db = mongo.db(dbName);
const ownerId = randomUUID(), partnerId = randomUUID(), eventId = randomUUID();
const salt = randomBytes(16).toString('hex');
await db.collection('partners').insertOne({ id: partnerId, name: 'Tasarım Test', active: true });
await db.collection('users').insertOne({ id: ownerId, email: 'design-owner', role: 'owner', partner_id: partnerId, display_name: 'Tasarım Test', must_change_password: false, disabled: false, salt, passwordHash: scryptSync('Design-test-password-2026!', salt, 64).toString('hex') });
await db.collection('weddings').insertOne({ id: eventId, slug: 'design-preview', partner_id: partnerId, owner_id: ownerId, title: 'Hilal & Oğuz', bride_name: 'Hilal', groom_name: 'Oğuz', event_type: 'Düğün', wedding_date: '2026-10-02', cover_images: ['/covers/couple-1.jpg'], logo_url: '', hero_message: 'Birlikte, bir ömür.', thank_you_message: 'İyi ki bizimlesiniz.', created_at: new Date().toISOString(), upload_days: 7, trash_days: 7, uploads_open_at: new Date().toISOString(), uploads_close_at: new Date(Date.now() + 86400000).toISOString(), expires_at: new Date(Date.now() + 86400000 * 90).toISOString(), upload_enabled: true, purged_at: null });
const port = process.env.TEST_PORT || '3101';
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', port], { windowsHide: true, env: { ...process.env, NODE_ENV: 'development', MONGODB_DB: dbName, NEXT_DIST_DIR: '.next-design-test' }, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
console.log(`Design fixture: http://localhost:${port}/admin/${eventId}`);
console.log('Test-only account: design-owner / Design-test-password-2026!');
let stopping = false;
async function stop() {
  if (stopping) return; stopping = true;
  child.kill();
  if (!dbName.startsWith('test_design_browser_')) throw new Error('Unexpected fixture database');
  await db.dropDatabase(); await mongo.close(); process.exit();
}
process.on('SIGINT', stop); process.on('SIGTERM', stop); child.on('exit', stop);
setTimeout(stop, 20 * 60 * 1000);
