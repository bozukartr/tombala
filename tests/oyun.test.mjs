/* tests/oyun.test.mjs — uçtan uca oyun testleri.
 *
 *   npm i --no-save --no-package-lock playwright
 *   node tests/oyun.test.mjs
 *
 * Tarayıcı ikilisi hazır bir yerdeyse yolunu ver:
 *   CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tests/oyun.test.mjs
 *
 * Oyun düz script olduğu için saf mantık da tarayıcı içinde, window.Tombala
 * üzerinden sınanıyor; ayrı bir modül kopyası tutmuyoruz.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KOK = dirname(dirname(fileURLToPath(import.meta.url)));
const URL = 'file://' + join(KOK, 'index.html');

const gecti = [];
const kalan = [];
const konsolHatalari = [];

function kontrol(ad, kosul, detay = '') {
  if (kosul) { gecti.push(ad); console.log(`  ok  ${ad}`); }
  else { kalan.push(ad); console.log(`  YOK ${ad}${detay ? '  -> ' + detay : ''}`); }
}
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const tarayici = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const baglam = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const sayfa = await tarayici.newPage(baglam);
sayfa.on('console', (m) => { if (m.type() === 'error') konsolHatalari.push(m.text()); });
sayfa.on('pageerror', (e) => konsolHatalari.push('pageerror: ' + e.message));
await sayfa.goto(URL);

/* ================= Çekirdek: kart ve değerlendirme ================= */
console.log('\nÇekirdek');

kontrol('window.Tombala dışa veriliyor',
  await sayfa.evaluate(() => typeof window.Tombala?.kartUret === 'function'));

kontrol('2000 kartın hepsi kurallara uygun', await sayfa.evaluate(() => {
  for (let i = 0; i < 2000; i++) {
    const h = Tombala.kartDogrula(Tombala.kartUret());
    if (h.length) return false;
  }
  return true;
}));

kontrol('kartDogrula bozuk kartı yakalıyor', await sayfa.evaluate(() => {
  const k = Tombala.kartUret();
  const i = k.findIndex((v) => v !== null);
  k[i] = 91;                       // hiçbir sütuna uymayan sayı
  return Tombala.kartDogrula(k).length > 0;
}));

kontrol('çıkmamış sayıyı işaretlemek satır tamamlamıyor', await sayfa.evaluate(() => {
  const k = Tombala.kartUret();
  const hepsi = Tombala.kartSayilari(k);
  return Tombala.degerlendir(k, hepsi, []).tamSatir === 0;
}));

kontrol('tam kart tombala sayılıyor', await sayfa.evaluate(() => {
  const k = Tombala.kartUret();
  const hepsi = Tombala.kartSayilari(k);
  const d = Tombala.degerlendir(k, hepsi, hepsi);
  return d.tamam && d.tamSatir === 3 && d.isaretli === 15;
}));

kontrol('tek satır işaretlemek 1 satır tamamlıyor', await sayfa.evaluate(() => {
  const k = Tombala.kartUret();
  const satir = Tombala.satirSayilari(k, 0);
  const d = Tombala.degerlendir(k, satir, Tombala.kartSayilari(k));
  return d.tamSatir === 1 && !d.tamam;
}));

kontrol('kacanlar çıkmış ama işaretlenmemişleri veriyor', await sayfa.evaluate(() => {
  const k = Tombala.kartUret();
  const hepsi = Tombala.kartSayilari(k);
  const eksik = Tombala.kacanlar(k, [hepsi[0]], hepsi);
  return eksik.length === 14 && !eksik.includes(hepsi[0]);
}));

kontrol('torba 90 sayının hepsini içeriyor', await sayfa.evaluate(() => {
  const t = Tombala.torbaKur();
  return t.length === 90 && new Set(t).size === 90 && Math.min(...t) === 1 && Math.max(...t) === 90;
}));

/* ================= Ana menü ================= */
console.log('\nAna menü');

kontrol('menü açılıyor', await sayfa.locator('#ekran-menu.ekran--acik').isVisible());
kontrol('oyun ekranı gizli', !(await sayfa.locator('#ekran-oyun').isVisible()));
kontrol('nasıl oynanır üç madde', (await sayfa.locator('.liste li').count()) === 3);

await sayfa.locator('#secim-hiz button[data-deger="2000"]').click();
await sayfa.reload();
kontrol('ayar yeniden yüklemede korunuyor',
  await sayfa.locator('#secim-hiz button[data-deger="2000"]').evaluate((b) => b.classList.contains('secili')));

/* ================= Kart yapısı (arayüzde) ================= */
console.log('\nKart');

const ayarSec = async (kutu, deger) => {
  if (!(await sayfa.locator('#ekran-menu.ekran--acik').isVisible())) {
    if (await sayfa.locator('#perde').isVisible()) await sayfa.locator('#btn-anamenu').click();
    else await sayfa.locator('#btn-menu').click();
  }
  await sayfa.locator(`#${kutu} button[data-deger="${deger}"]`).click();
};

await ayarSec('secim-rakip', '0');
await sayfa.locator('#btn-basla').click();

const kartOku = () => sayfa.$$eval('#kart > *', (els) =>
  els.map((e) => (e.dataset.sayi ? Number(e.dataset.sayi) : null)));

let kart = await kartOku();
kontrol('kartta 27 hücre', kart.length === 27, `${kart.length}`);
kontrol('kartta 15 sayı', kart.filter((v) => v !== null).length === 15);
kontrol('çizilen kart çekirdek doğrulamasından geçiyor',
  (await sayfa.evaluate((k) => Tombala.kartDogrula(k), kart)).length === 0);

/* ================= Elle işaretleme ================= */
console.log('\nİşaretleme');

await sayfa.locator('#btn-durdur').click();          // çekilişi durdur, elle sür
kart = await kartOku();
const ilk = kart.find((v) => v !== null);
await sayfa.locator(`#kart .hucre[data-sayi="${ilk}"]`).click();
kontrol('çıkmamış sayı işaretlenemiyor',
  !(await sayfa.locator(`#kart .hucre[data-sayi="${ilk}"]`).evaluate((h) => h.classList.contains('isaretli'))));
kontrol('çıkmamış sayı uyarı veriyor',
  (await sayfa.locator('#bildirim').textContent()).includes('henüz çıkmadı'));

let hedef = null;
for (let i = 0; i < 90 && hedef === null; i++) {
  await sayfa.locator('#btn-cek').click();
  const c = Number(await sayfa.locator('#cikan').textContent());
  if (kart.includes(c)) hedef = c;
}
kontrol('çekilen sayı kartta bulundu', hedef !== null);
await sayfa.locator(`#kart .hucre[data-sayi="${hedef}"]`).click();
kontrol('çıkan sayı işaretlenebiliyor',
  await sayfa.locator(`#kart .hucre[data-sayi="${hedef}"]`).evaluate((h) => h.classList.contains('isaretli')));

/* ================= Tek başına tam oyun ================= */
console.log('\nTek başına oyun');

await ayarSec('secim-rakip', '0');
await ayarSec('secim-isaret', 'otomatik');
await sayfa.locator('#btn-basla').click();
kontrol('rakip yokken oyuncu şeridi gizli', await sayfa.locator('#oyuncular').isHidden());
await sayfa.locator('#btn-durdur').click();

let cinko1 = false, cinko2 = false;
for (let i = 0; i < 90; i++) {
  if (await sayfa.locator('#perde').isVisible()) break;
  cinko1 ||= await sayfa.locator('#rozet-cinko1').evaluate((e) => e.classList.contains('alindi'));
  cinko2 ||= await sayfa.locator('#rozet-cinko2').evaluate((e) => e.classList.contains('alindi'));
  await sayfa.locator('#btn-cek').click();
}
kontrol('1. çinko alındı', cinko1);
kontrol('2. çinko alındı', cinko2);
kontrol('tombala ile perde açıldı', await sayfa.locator('#perde').isVisible());
kontrol('başlık tombala senin',
  (await sayfa.locator('#sonuc-baslik').textContent()).includes('Tombala senin'));
kontrol('15 hücre işaretli', (await sayfa.locator('#kart .hucre.isaretli').count()) === 15);
kontrol('sonuç listesi üç aşama gösteriyor',
  (await sayfa.locator('.sonuc-satir').count()) === 3);
kontrol('rozetlerde kazanan adı yazıyor',
  (await sayfa.locator('#rozet-cinko1').textContent()).includes('Sen'));

/* ================= Tekrar oyna ================= */
await sayfa.locator('#btn-tekrar').click();
kontrol('tekrar oyna perdeyi kapatıyor', !(await sayfa.locator('#perde').isVisible()));
kontrol('sayaç sıfırlandı', (await sayfa.locator('#sayi-cikan').textContent()) === '0');
kontrol('rozetler söndü',
  !(await sayfa.locator('#rozet-cinko1').evaluate((e) => e.classList.contains('alindi'))));
kontrol('işaretler temizlendi', (await sayfa.locator('#kart .hucre.isaretli').count()) === 0);
kontrol('rozet yazısı sıfırlandı',
  (await sayfa.locator('#rozet-cinko1').textContent()).trim() === '1. Çinko');

/* ================= Rakipli oyun ================= */
console.log('\nRakipler');

await ayarSec('secim-rakip', '2');
await ayarSec('secim-isaret', 'elle');
await ayarSec('secim-hiz', '2000');
await sayfa.locator('#btn-basla').click();

kontrol('oyuncu şeridi görünüyor', await sayfa.locator('#oyuncular').isVisible());
kontrol('şeritte 3 oyuncu var', (await sayfa.locator('.ocip').count()) === 3);
kontrol('şeritte ben işaretliyim', (await sayfa.locator('.ocip--ben').count()) === 1);

await sayfa.locator('#btn-durdur').click();
// Hiç işaretlemiyoruz: bütün aşamaları botlar kapmalı.
for (let i = 0; i < 90; i++) {
  if (await sayfa.locator('#perde').isVisible()) break;
  if (await sayfa.locator('#btn-cek').isDisabled()) break;
  await sayfa.locator('#btn-cek').click();
}
await bekle(2500);   // botların son işaretleri düşsün

const kazananlar = await sayfa.$$eval('.sonuc-satir__kim', (e) => e.map((x) => x.textContent.trim()));
kontrol('1. çinkoyu bir bot aldı',
  kazananlar[0] && kazananlar[0] !== 'kimse alamadı' && !kazananlar[0].includes('Sen'), kazananlar[0]);
kontrol('2. çinkoyu bir bot aldı',
  kazananlar[1] && kazananlar[1] !== 'kimse alamadı' && !kazananlar[1].includes('Sen'), kazananlar[1]);
kontrol('oyun bitti perdesi açıldı', await sayfa.locator('#perde').isVisible());
kontrol('hiç işaretlemeyince tombala bana gelmedi',
  !(await sayfa.locator('#sonuc-baslik').textContent()).includes('senin'));
kontrol('bot ilerlemesi şeritte görünüyor', await sayfa.evaluate(() => {
  const barlar = [...document.querySelectorAll('.ocip__bar i')].map((i) => parseFloat(i.style.width));
  return barlar.length === 3 && barlar.slice(1).every((w) => w > 0);
}));

/* ================= Mobil davranış ================= */
console.log('\nMobil davranış');

const meta = await sayfa.locator('meta[name="viewport"]').getAttribute('content');
kontrol('viewport user-scalable=no', meta.includes('user-scalable=no'), meta);
kontrol('viewport maximum-scale=1', meta.includes('maximum-scale=1'));
kontrol('viewport-fit=cover', meta.includes('viewport-fit=cover'));
kontrol('html touch-action: manipulation',
  (await sayfa.evaluate(() => getComputedStyle(document.documentElement).touchAction)) === 'manipulation');

const govde = await sayfa.evaluate(() => {
  const s = getComputedStyle(document.body);
  return { pos: s.position, ov: s.overflow, oB: s.overscrollBehaviorY, sec: s.userSelect || s.webkitUserSelect };
});
kontrol('gövde sabit (lastik esneme yok)', govde.pos === 'fixed', JSON.stringify(govde));
kontrol('gövde kaydırmıyor', govde.ov === 'hidden');
kontrol('aşağı çekince yenileme kapalı', govde.oB === 'none');
kontrol('metin seçimi kapalı', govde.sec === 'none');
kontrol('dblclick engelleniyor', await sayfa.evaluate(() => {
  const e = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
  document.body.dispatchEvent(e);
  return e.defaultPrevented;
}));
kontrol('çimdik jesti engelleniyor', await sayfa.evaluate(() => {
  const e = new Event('gesturestart', { bubbles: true, cancelable: true });
  document.dispatchEvent(e);
  return e.defaultPrevented;
}));

/* ================= Yerleşim ================= */
console.log('\nYerleşim');

async function yerlesimSina(ad, w, h, enAz) {
  const p = await tarayici.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  await p.goto(URL);
  await p.locator('#btn-basla').click();
  await p.locator('#btn-durdur').click();
  await p.locator('#btn-cek').click();
  await bekle(600);
  const o = await p.evaluate(() => {
    const oyun = document.querySelector('#ekran-oyun');
    const tahta = document.querySelector('.tahta');
    const kart = document.querySelector('#kart').getBoundingClientRect();
    const hucre = document.querySelector('.hucre').getBoundingClientRect();
    const tas = document.querySelector('#cikan').getBoundingClientRect();
    return {
      dikey: oyun.scrollHeight - oyun.clientHeight,
      yatay: oyun.scrollWidth - oyun.clientWidth,
      tasti: kart.width > tahta.clientWidth + 1,
      oran: kart.width / tahta.clientWidth,
      boyOran: kart.height / Math.max(tahta.clientHeight - document.querySelector('#ipucu').offsetHeight - 8, 1),
      hucre: Math.round(hucre.width),
      tas: Math.round(tas.width),
    };
  });
  await p.close();
  kontrol(`${ad}: oyun kaydırmıyor`, o.dikey <= 1 && o.yatay <= 1, JSON.stringify(o));
  kontrol(`${ad}: kart tahtaya sığıyor`, !o.tasti);
  // Kart ya genişliğe ya boya dayanmalı; yatay ekranda sınır boydan gelir.
  kontrol(`${ad}: kart eldeki alanı dolduruyor`,
    Math.max(o.oran, o.boyOran) >= 0.9,
    `en=${o.oran.toFixed(2)} boy=${o.boyOran.toFixed(2)}`);
  kontrol(`${ad}: hücre dokunulabilir (>=${enAz}px)`, o.hucre >= enAz, `${o.hucre}px`);
  kontrol(`${ad}: çıkan sayı taşı büyük (>=80px)`, o.tas >= 80, `${o.tas}px`);
}

await yerlesimSina('320x568', 320, 568, 26);
await yerlesimSina('390x844', 390, 844, 30);
await yerlesimSina('430x932', 430, 932, 32);
await yerlesimSina('740x360 yatay', 740, 360, 30);

/* ================= Konsol ================= */
kontrol('konsol hatası yok', konsolHatalari.length === 0, konsolHatalari.slice(0, 2).join(' | '));

await tarayici.close();
console.log(`\n${gecti.length}/${gecti.length + kalan.length} geçti`);
if (kalan.length) {
  console.log('\nBAŞARISIZ:');
  kalan.forEach((k) => console.log('  !!', k));
  process.exit(1);
}
