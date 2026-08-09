import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('app.js tarafından kullanılan sabit id seçicileri HTML içinde var', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('js/app.js', root), 'utf8'),
  ]);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const usedIds = [...app.matchAll(/\$\('#([a-z0-9-]+)'\)/gi)].map((match) => match[1]);
  const missing = [...new Set(usedIds.filter((id) => !ids.has(id)))];
  assert.deepEqual(missing, []);
});

test('HTML içindeki yerel kaynakların tamamı mevcut', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const paths = [...html.matchAll(/(?:src|href)="((?!https?:|#)[^"]+)"/g)].map((match) => match[1]);
  await Promise.all(paths.map((path) => access(new URL(path, root))));
});

test('eski Firebase projesi veya gerçek anahtar repoda kalmadı', async () => {
  const files = ['firebase-config.js', 'README.md', 'js/app.js', 'js/services/firebase-room.js'];
  const content = (await Promise.all(files.map((file) => readFile(new URL(file, root), 'utf8')))).join('\n');
  assert.equal(content.includes('tombala-35469'), false);
  assert.equal(/AIzaSy[A-Za-z0-9_-]{20,}/.test(content), false);
});
