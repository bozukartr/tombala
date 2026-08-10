/* tests/oda.test.mjs — çevrimiçi oda testleri (Firebase emulator gerektirir).
 *
 * Ayrı bir terminalde:
 *   npx firebase-tools emulators:start --only database,auth,hosting --project tombala
 * sonra:
 *   node tests/oda.test.mjs
 *
 * Uygulama ?emulator=1 ile açıldığında yerel emulator'e bağlanır.
 */
import { chromium } from 'playwright';

const URL = process.env.TOMBALA_URL || 'http://127.0.0.1:5050/index.html?emulator=1&sdk=/vendor/firebase-hepsi.js';
const gecti = [];
const kalan = [];
function kontrol(ad, kosul, detay = '') {
  if (kosul) { gecti.push(ad); console.log(`  ok  ${ad}`); }
  else { kalan.push(ad); console.log(`  YOK ${ad}${detay ? '  -> ' + detay : ''}`); }
}
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const tarayici = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const yeniOyuncu = async (ad) => {
  const b = await tarayici.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await b.newPage();
  const hatalar = [];
  p.on('pageerror', (e) => hatalar.push(e.message));
  await p.goto(URL);
  await p.evaluate((n) => localStorage.setItem('tombala.ad', n), ad);
  await p.reload();
  return { b, p, hatalar };
};

console.log('\nOda kurma');
const A = await yeniOyuncu('Ayse');
await A.p.locator('#btn-oda-kur').click();
// SDK dinamik yükleniyor; çekmece yüklenme bitince açılıyor.
await A.p.waitForSelector('#giris:not([hidden])', { timeout: 15000 }).catch(() => {});
kontrol('giriş çekmecesi açılıyor', await A.p.locator('#giris').isVisible());
await A.p.locator('#btn-giris-anonim').click();
await A.p.waitForSelector('#ekran-lobi.ekran--acik', { timeout: 15000 });

const kod = (await A.p.locator('#oda-kodu').textContent()).trim();
kontrol('oda kodu 5 haneli', /^\d{5}$/.test(kod), kod);
kontrol('kuranın kartı odaya yazıldı', await A.p.evaluate(async (k) => {
  const r = await fetch(`http://127.0.0.1:9000/odalar/${k}.json?ns=tombala`);
  const d = await r.json();
  return Object.values(d.oyuncular).every((o) => (o.kart || '').split(',').length === 27);
}, kod));
kontrol('lobide oda kodu kutusu görünüyor', await A.p.locator('#oda-kodu-kutu').isVisible());
kontrol('kuran kişi listede', (await A.p.locator('.oyuncu-satir').count()) === 1);
kontrol('kuran kişi host (taç)',
  (await A.p.locator('.oyuncu-satir__ad').first().textContent()).includes('👑'));
kontrol('hazırım düğmesi çevrimiçi modda görünüyor', await A.p.locator('#btn-hazir').isVisible());
kontrol('çevrimiçi lobide profil seçicileri dolu',
  (await A.p.locator('#avatar-secici button').count()) > 0
  && (await A.p.locator('#renk-secici button').count()) > 0);
kontrol('kayıtlı ad çevrimiçi lobide görünüyor',
  (await A.p.locator('#in-ad').inputValue()) === 'Ayse');

// ad değişikliği karşı tarafa yansımalı


console.log('\nOdaya katılma');
const B = await yeniOyuncu('Bora');
await B.p.locator('#btn-odaya-katil').click();
kontrol('kod ekranı açılıyor', await B.p.locator('#ekran-katil.ekran--acik').isVisible());
const kutular = await B.p.locator('#kod-girisi input').all();
for (let i = 0; i < 5; i++) await kutular[i].fill(kod[i]);
kontrol('kod dolunca gir düğmesi açılıyor', !(await B.p.locator('#btn-katil').isDisabled()));
await B.p.locator('#btn-katil').click();
await B.p.locator('#btn-giris-anonim').click();
await B.p.waitForSelector('#ekran-lobi.ekran--acik', { timeout: 15000 });
await bekle(1200);

kontrol('katılan lobide iki oyuncu görüyor', (await B.p.locator('.oyuncu-satir').count()) === 2);
kontrol('kuran da iki oyuncu görüyor', (await A.p.locator('.oyuncu-satir').count()) === 2);
kontrol('adlar karşı tarafta görünüyor',
  (await A.p.locator('#lobi-oyuncular').textContent()).includes('Bora'));
kontrol('katılan host değil',
  !(await B.p.locator('.oyuncu-satir__ad').nth(1).textContent()).includes('👑'));
kontrol('katılanda başlat düğmesi gizli', await B.p.locator('#btn-oyunu-baslat').isHidden());

console.log('\nHazır durumu');
await B.p.locator('#btn-hazir').click();
await bekle(1200);
kontrol('hazır durumu karşı tarafa yansıyor',
  (await A.p.locator('#lobi-oyuncular').textContent()).includes('hazır'));
kontrol('hazır düğmesi durum değiştiriyor',
  (await B.p.locator('#btn-hazir').textContent()).includes('Hazır değilim'));

console.log('\nProfil eşitleme');
await B.p.locator('#in-ad').fill('Boracan');
await bekle(1500);
kontrol('ad değişikliği karşı tarafa yansıyor',
  (await A.p.locator('#lobi-oyuncular').textContent()).includes('Boracan'));
await A.p.locator('#avatar-secici button').nth(2).click();
await bekle(1200);
kontrol('avatar değişikliği karşı tarafa yansıyor', await B.p.evaluate(async (k) => {
  const r = await fetch(`http://127.0.0.1:9000/odalar/${k}.json?ns=tombala`);
  const d = await r.json();
  return new Set(Object.values(d.oyuncular).map((o) => o.avatar)).size === 2;
}, kod));

console.log('\nKart eşitleme');
const kartOku = (p) => p.$$eval('#lobi-kart > *', (e) => e.filter((x) => x.textContent).map((x) => Number(x.textContent)).sort((a, b) => a - b).join());
const eski = await kartOku(B.p);
await B.p.locator('#btn-rastgele-kart').click();
await bekle(1200);
kontrol('rastgele kart lobide değişiyor', (await kartOku(B.p)) !== eski);
kontrol('kart sunucuya yazıldı', await A.p.evaluate(async (k) => {
  const r = await fetch(`http://127.0.0.1:9000/odalar/${k}.json?ns=tombala`);
  const d = await r.json();
  return Object.values(d.oyuncular).every((o) => (o.kart || '').split(',').length === 27);
}, kod));

console.log('\nOdadan çıkma');
await B.p.locator('#btn-lobi-geri').click();
await bekle(1200);
kontrol('çıkan menüye dönüyor', await B.p.locator('#ekran-menu.ekran--acik').isVisible());
kontrol('kalan tek oyuncu görüyor', (await A.p.locator('.oyuncu-satir').count()) === 1);

console.log('\nHatalı kod');
await B.p.locator('#btn-odaya-katil').click();
const kutular2 = await B.p.locator('#kod-girisi input').all();
for (let i = 0; i < 5; i++) await kutular2[i].fill('9');
await B.p.locator('#btn-katil').click();
await bekle(1500);
kontrol('olmayan oda reddediliyor',
  (await B.p.locator('#bildirim').textContent()).includes('bulunamadı'));

kontrol('sayfa hatası yok (kuran)', A.hatalar.length === 0, A.hatalar[0] || '');
kontrol('sayfa hatası yok (katılan)', B.hatalar.length === 0, B.hatalar[0] || '');

await A.p.screenshot({ path: '/tmp/claude-0/-home-user-tombala/55b32062-00e1-522a-9875-8225620db441/scratchpad/o-lobi.png', fullPage: true });
await tarayici.close();
console.log(`\n${gecti.length}/${gecti.length + kalan.length} geçti`);
if (kalan.length) { console.log('\nBAŞARISIZ:'); kalan.forEach((k) => console.log('  !!', k)); process.exit(1); }
