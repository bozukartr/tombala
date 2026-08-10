/* Tombala — tek dosya oyun mantığı.
   Modül kullanmıyoruz; dosya file:// üzerinden de açılabilsin diye düz script.

   Yapı: önce DOM bilmeyen çekirdek, sonra arayüz. Çekirdek `window.Tombala`
   olarak dışa veriliyor; testler ve ileride gelecek ağ katmanı onu kullanacak. */
(() => {
  'use strict';

  /* ==================================================================
     ÇEKİRDEK — saf mantık, DOM ve zamanlayıcı bilmez
     ================================================================== */

  const SATIR = 3;
  const SUTUN = 9;
  const SATIR_BASI = 5;   // her satırda kaç sayı
  const KART_SAYI = 15;   // karttaki toplam sayı
  const EN_BUYUK = 90;

  const rastgele = (n) => Math.floor(Math.random() * n);

  function karistir(dizi) {
    const a = dizi.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rastgele(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Sütun aralıkları: 1-9, 10-19, ... 70-79, 80-90.
  function sutunAraligi(c) {
    if (c === 0) return [1, 9];
    if (c === 8) return [80, EN_BUYUK];
    return [c * 10, c * 10 + 9];
  }

  // Her sütunda 1-3 sayı olacak şekilde toplam 15'i dağıt.
  function sutunAdetleri() {
    const adet = Array(SUTUN).fill(1);
    let kalan = KART_SAYI - SUTUN;
    while (kalan > 0) {
      const i = rastgele(SUTUN);
      if (adet[i] < 3) { adet[i]++; kalan--; }
    }
    return adet;
  }

  // Sütun adetlerini satırlara yerleştir: her satırda tam 5 dolu hücre.
  // Sütunlar adede göre azalan sırada işlenir, her seferinde yeri en bol olan
  // satırlar seçilir. Tıkanırsa baştan denenir.
  function satirlaraDagit(adet) {
    for (let deneme = 0; deneme < 80; deneme++) {
      const kapasite = Array(SATIR).fill(SATIR_BASI);
      const dolu = Array(SATIR * SUTUN).fill(false);
      const sira = adet
        .map((n, i) => ({ n, i, k: Math.random() }))
        .sort((a, b) => b.n - a.n || a.k - b.k);

      let oldu = true;
      for (const { n, i } of sira) {
        const satirlar = [0, 1, 2]
          .map((r) => ({ r, kap: kapasite[r], k: Math.random() }))
          .sort((a, b) => b.kap - a.kap || a.k - b.k)
          .slice(0, n);
        for (const { r } of satirlar) {
          if (kapasite[r] <= 0) { oldu = false; break; }
          dolu[r * SUTUN + i] = true;
          kapasite[r]--;
        }
        if (!oldu) break;
      }
      if (oldu && kapasite.every((k) => k === 0)) return dolu;
    }
    return null;
  }

  /** 27 hücrelik kart döndürür; boş hücreler null. */
  function kartUret() {
    let dolu = null;
    let adet;
    while (!dolu) {
      adet = sutunAdetleri();
      dolu = satirlaraDagit(adet);
    }
    const kart = Array(SATIR * SUTUN).fill(null);
    for (let c = 0; c < SUTUN; c++) {
      const [alt, ust] = sutunAraligi(c);
      const havuz = [];
      for (let n = alt; n <= ust; n++) havuz.push(n);
      const secilen = karistir(havuz).slice(0, adet[c]).sort((a, b) => a - b);
      let k = 0;
      for (let r = 0; r < SATIR; r++) {
        if (dolu[r * SUTUN + c]) kart[r * SUTUN + c] = secilen[k++];
      }
    }
    return kart;
  }

  /** Kartın tombala kurallarına uygunluğunu sınar; hata metinleri döndürür. */
  function kartDogrula(kart) {
    const h = [];
    if (!Array.isArray(kart) || kart.length !== SATIR * SUTUN) return ['Hücre sayısı 27 değil'];
    const sayilar = kart.filter((v) => v !== null);
    if (sayilar.length !== KART_SAYI) h.push(`Kartta ${sayilar.length} sayı var`);
    if (new Set(sayilar).size !== sayilar.length) h.push('Tekrar eden sayı var');
    for (let r = 0; r < SATIR; r++) {
      const n = satirSayilari(kart, r).length;
      if (n !== SATIR_BASI) h.push(`${r + 1}. satırda ${n} sayı var`);
    }
    for (let c = 0; c < SUTUN; c++) {
      const [alt, ust] = sutunAraligi(c);
      const sut = [];
      for (let r = 0; r < SATIR; r++) {
        const v = kart[r * SUTUN + c];
        if (v !== null) {
          if (v < alt || v > ust) h.push(`${v} sayısı ${c + 1}. sütunda olamaz`);
          sut.push(v);
        }
      }
      if (sut.length < 1) h.push(`${c + 1}. sütun boş`);
      if (sut.length > 3) h.push(`${c + 1}. sütunda 3'ten fazla sayı var`);
      for (let i = 1; i < sut.length; i++) {
        if (sut[i] <= sut[i - 1]) h.push(`${c + 1}. sütun artan sırada değil`);
      }
    }
    return h;
  }

  /** Bir sayı hangi sütuna düşer? */
  function sutunNo(n) {
    if (n <= 9) return 0;
    if (n >= 80) return 8;
    return Math.floor(n / 10);
  }

  /** Elle seçilmiş 15 sayıdan geçerli bir kart düzeni kurar. */
  function sayilardanKart(sayilar) {
    const nums = [...new Set(sayilar)].sort((a, b) => a - b);
    if (nums.length !== KART_SAYI) throw new Error('15 sayı gerekli');

    const sutunlar = Array.from({ length: SUTUN }, () => []);
    for (const n of nums) {
      if (!Number.isInteger(n) || n < 1 || n > EN_BUYUK) throw new Error('Geçersiz sayı: ' + n);
      sutunlar[sutunNo(n)].push(n);
    }
    const adet = sutunlar.map((a) => a.length);
    if (adet.some((c) => c < 1)) throw new Error('Boş sütun bırakılamaz');
    if (adet.some((c) => c > 3)) throw new Error("Bir sütunda en çok 3 sayı olur");

    let dolu = null;
    for (let i = 0; i < 20 && !dolu; i++) dolu = satirlaraDagit(adet);
    if (!dolu) throw new Error('Kart düzeni kurulamadı');

    const kart = Array(SATIR * SUTUN).fill(null);
    for (let c = 0; c < SUTUN; c++) {
      let k = 0;
      for (let r = 0; r < SATIR; r++) {
        if (dolu[r * SUTUN + c]) kart[r * SUTUN + c] = sutunlar[c][k++];
      }
    }
    return kart;
  }

  /** Kart kurarken anlık geri bildirim. */
  function secimIncele(sayilar) {
    const nums = [...new Set(sayilar)];
    const adet = Array(SUTUN).fill(0);
    for (const n of nums) adet[sutunNo(n)]++;
    const sorunlar = [];
    if (nums.length > KART_SAYI) sorunlar.push('15 sayıdan fazla seçildi');
    adet.forEach((c, i) => {
      if (c > 3) sorunlar.push(`${i + 1}. sütunda 3'ten fazla sayı var`);
    });
    const bosSutun = adet.filter((c) => c === 0).length;
    if (nums.length === KART_SAYI && bosSutun > 0) sorunlar.push('Boş sütun bırakılamaz');
    return {
      adet,
      kalan: KART_SAYI - nums.length,
      gecerli: nums.length === KART_SAYI && sorunlar.length === 0,
      sorunlar,
    };
  }

  const satirSayilari = (kart, r) =>
    kart.slice(r * SUTUN, r * SUTUN + SUTUN).filter((v) => v !== null);

  const kartSayilari = (kart) => kart.filter((v) => v !== null);

  /** Karışık 1-90 torbası. */
  const torbaKur = () => karistir(Array.from({ length: EN_BUYUK }, (_, i) => i + 1));

  const kumeye = (x) => (x instanceof Set ? x : new Set(x || []));

  /**
   * Bir kartın durumu. Geçerli işaret = oyuncunun işaretledikleri ∩ çıkanlar,
   * yani çıkmamış sayıyı işaretlemek bir işe yaramaz.
   */
  function degerlendir(kart, isaretli, cikanlar) {
    const c = kumeye(cikanlar);
    const i = kumeye(isaretli);
    const gecerli = (n) => i.has(n) && c.has(n);
    const satirlar = [];
    for (let r = 0; r < SATIR; r++) satirlar.push(satirSayilari(kart, r).every(gecerli));
    const hepsi = kartSayilari(kart);
    return {
      satirlar,
      tamSatir: satirlar.filter(Boolean).length,
      isaretli: hepsi.filter(gecerli).length,
      tamam: hepsi.every(gecerli),
    };
  }

  /** Kartta olan, çıkmış ama henüz işaretlenmemiş sayılar. */
  function kacanlar(kart, isaretli, cikanlar) {
    const c = kumeye(cikanlar);
    const i = kumeye(isaretli);
    return kartSayilari(kart).filter((n) => c.has(n) && !i.has(n));
  }

  /* ---------- İlan ve hakem ----------
     İlanı oyuncu yapar, doğrulamayı hakem yürütür. "Kazandım" iddiasına
     güvenilmez: hak ediş her zaman oyuncunun işaretleri ve çıkan sayılardan
     yeniden hesaplanır. Online modda bu fonksiyonlar host tarafında aynen
     çalışacak, o yüzden ağ ve DOM bilmiyorlar. */

  const ILAN_TURLERI = ['cinko1', 'cinko2', 'tombala'];
  const ILAN_ADI = { cinko1: '1. Çinko', cinko2: '2. Çinko', tombala: 'Tombala' };
  const YANLIS_ILAN_CEZASI = 10000;

  /** Oyuncu şu an bu aşamayı gerçekten hak ediyor mu? */
  function hakEdiyor(oyuncu, tur, cikanlar) {
    const d = degerlendir(oyuncu.kart, oyuncu.isaretli, cikanlar);
    if (tur === 'tombala') return d.tamam;
    if (tur === 'cinko2') return d.tamSatir >= 2;
    if (tur === 'cinko1') return d.tamSatir >= 1;
    return false;
  }

  /** Tek bir ilanın geçerliliği. kazananlar = { cinko1:[], cinko2:[], tombala:[] } */
  function ilanDogrula({ ilan, oyuncu, cikanlar, kazananlar }) {
    if (!ILAN_TURLERI.includes(ilan?.tur)) return { gecerli: false, sebep: 'Bilinmeyen ilan' };
    if (!oyuncu) return { gecerli: false, sebep: 'Oyuncu bulunamadı' };
    const k = { cinko1: [], cinko2: [], tombala: [], ...(kazananlar || {}) };
    if (k[ilan.tur].includes(ilan.oyuncuId)) return { gecerli: false, sebep: 'Bunu zaten aldın' };
    if (k[ilan.tur].length) return { gecerli: false, sebep: ILAN_ADI[ilan.tur] + ' alındı' };
    if (ilan.tur === 'cinko2' && !k.cinko1.length) {
      return { gecerli: false, sebep: 'Önce 1. çinko ilan edilmeli' };
    }
    if (!hakEdiyor(oyuncu, ilan.tur, cikanlar)) {
      const eksik = { cinko1: 'Tamamlanmış satır yok', cinko2: 'İki satır tamamlanmadı', tombala: 'Kart tamamlanmadı' };
      return { gecerli: false, sebep: eksik[ilan.tur] };
    }
    return { gecerli: true };
  }

  /**
   * Bekleyen ilanları sırayla karara bağlar.
   * Sıra çekiliş numarasına göre: aynı çekilişte gelen geçerli ilanlar
   * paylaşımlı sayılır, böylece kimin parmağının daha hızlı olduğu değil
   * kimin o çekilişte hak ettiği belirleyici olur.
   */
  function ilanlariCoz({ ilanlar, oyuncular, cikanlar, kazananlar }) {
    const k = {
      cinko1: [...(kazananlar?.cinko1 || [])],
      cinko2: [...(kazananlar?.cinko2 || [])],
      tombala: [...(kazananlar?.tombala || [])],
    };
    const bul = (id) => oyuncular.find((o) => o.id === id);
    const sonuclar = {};
    const sirali = [...(ilanlar || [])].sort(
      (a, b) => (a.cekilisNo - b.cekilisNo) || (a.zaman - b.zaman),
    );

    for (const ilan of sirali) {
      if (sonuclar[ilan.oyuncuId]) continue;
      const r = ilanDogrula({ ilan, oyuncu: bul(ilan.oyuncuId), cikanlar, kazananlar: k });
      sonuclar[ilan.oyuncuId] = r;
      if (!r.gecerli) continue;

      k[ilan.tur].push(ilan.oyuncuId);
      // Aynı çekilişte aynı türden gelen diğer hak edenler de kazansın.
      for (const digeri of sirali) {
        if (digeri === ilan || sonuclar[digeri.oyuncuId]) continue;
        if (digeri.tur !== ilan.tur || digeri.cekilisNo !== ilan.cekilisNo) continue;
        const o = bul(digeri.oyuncuId);
        if (o && hakEdiyor(o, digeri.tur, cikanlar)) {
          sonuclar[digeri.oyuncuId] = { gecerli: true };
          k[digeri.tur].push(digeri.oyuncuId);
        }
      }
    }
    return { sonuclar, kazananlar: k, bitti: k.tombala.length > 0 };
  }

  const Cekirdek = {
    SATIR, SUTUN, SATIR_BASI, KART_SAYI, EN_BUYUK,
    ILAN_TURLERI, ILAN_ADI, YANLIS_ILAN_CEZASI,
    karistir, sutunAraligi, sutunNo, kartUret, kartDogrula, torbaKur,
    sayilardanKart, secimIncele,
    satirSayilari, kartSayilari, degerlendir, kacanlar,
    hakEdiyor, ilanDogrula, ilanlariCoz,
  };
  window.Tombala = Cekirdek;   // testler ve ağ katmanı için

  /* ==================================================================
     ARAYÜZ
     ================================================================== */

  const KART_BOSLUK = 4;   // hücreler arası
  const KART_KENAR = 8;    // kartın iç payı
  const HUCRE_ORAN = 1.12;
  const HUCRE_EN_BUYUK = 58;

  const ASAMALAR = ILAN_TURLERI;
  const ASAMA_ADI = ILAN_ADI;

  const AVATARLAR = ['🎯', '🦁', '🐼', '🦄', '🐳', '🦖', '🍀', '⭐'];
  const RENKLER = ['#ffb43d', '#f0517a', '#34d39a', '#6bc5f5', '#c084fc', '#ff8a5b'];

  const BOT_ADLARI = ['Nihal', 'Ferit', 'Sevim', 'Cemre'];
  const BOT_YUZLERI = ['🦊', '🐢', '🦉', '🐝'];
  const BOT_RENKLERI = ['#f0517a', '#34d39a', '#6bc5f5', '#c084fc'];

  const $ = (s) => document.querySelector(s);
  const kacis = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ===================== Dokunma davranışı ===================== */
  /* Çift dokunuşla yakınlaştırmayı CSS'teki `touch-action: manipulation`
     kapatıyor. Aşağıdakiler eski iOS sürümleri ve çimdik jesti için. */

  ['gesturestart', 'gesturechange', 'gestureend'].forEach((tur) => {
    document.addEventListener(tur, (e) => e.preventDefault(), { passive: false });
  });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

  /* ===================== Ses ve titreşim ===================== */

  let sesAcik = localStorage.getItem('tombala.ses') !== 'kapali';
  let ac = null;   // AudioContext

  function sesiAc() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ac = new AC();
  }
  document.addEventListener('pointerdown', sesiAc, { once: true });

  function ton({ frek = 440, sure = .12, tip = 'sine', ses = .1, kaydir = 0, gecikme = 0 }) {
    if (!sesAcik || !ac) return;
    const t0 = ac.currentTime + gecikme;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = tip;
    osc.frequency.setValueAtTime(frek, t0);
    if (kaydir) osc.frequency.exponentialRampToValueAtTime(Math.max(40, frek + kaydir), t0 + sure);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(ses, t0 + .012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + sure);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + sure + .02);
  }

  function cizirti({ sure = .07, ses = .06 }) {
    if (!sesAcik || !ac) return;
    const n = Math.floor(ac.sampleRate * sure);
    const tampon = ac.createBuffer(1, n, ac.sampleRate);
    const d = tampon.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const kaynak = ac.createBufferSource();
    const g = ac.createGain();
    g.gain.value = ses;
    kaynak.buffer = tampon;
    kaynak.connect(g).connect(ac.destination);
    kaynak.start(ac.currentTime);
  }

  const sfx = {
    dokun:   () => ton({ frek: 620, sure: .05, tip: 'triangle', ses: .05 }),
    cek:     () => { cizirti({}); ton({ frek: 180, sure: .16, ses: .12, kaydir: -80 }); },
    isaret:  () => { ton({ frek: 880, sure: .06, tip: 'square', ses: .045 }); cizirti({ sure: .04, ses: .035 }); },
    cinko:   () => [523, 659, 784, 1047].forEach((f, i) => ton({ frek: f, sure: .26, ses: .095, gecikme: i * .08 })),
    kaptirdi: () => [392, 330].forEach((f, i) => ton({ frek: f, sure: .2, tip: 'triangle', ses: .07, gecikme: i * .1 })),
    tombala: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => ton({ frek: f, sure: .45, tip: 'triangle', ses: .1, gecikme: i * .1 })),
    hata:    () => ton({ frek: 160, sure: .22, tip: 'sawtooth', ses: .08, kaydir: -60 }),
  };

  function titre(desen) {
    if (!sesAcik || !navigator.vibrate) return;
    try { navigator.vibrate(desen); } catch { /* desteklenmiyor */ }
  }

  /* ===================== Durum ===================== */

  const ayarlar = {
    rakip: Number(localStorage.getItem('tombala.rakip') ?? 2),
    hiz: Number(localStorage.getItem('tombala.hiz')) || 3500,
    isaret: localStorage.getItem('tombala.isaret') || 'elle',
    ses: sesAcik ? 'acik' : 'kapali',
  };

  const BEN = 'ben';

  const profil = {
    ad: localStorage.getItem('tombala.ad') || '',
    avatar: localStorage.getItem('tombala.avatar') || AVATARLAR[0],
    renk: localStorage.getItem('tombala.renk') || RENKLER[0],
  };
  const adim = () => profil.ad.trim() || 'Sen';

  // Lobide seçilen kart; oyun bu kartla başlar, turlar arasında korunur.
  const L = { kart: null, kurulmus: false, secim: new Set() };

  const O = {
    oyuncular: [],   // { id, ad, avatar, renk, bot, tepki, kart, isaretli:Set }
    torba: [],
    cikanlar: [],
    kazananlar: { cinko1: [], cinko2: [], tombala: [] },
    tamSatirlar: [false, false, false],
    bekleyenIlanlar: [],   // hakemin karara bağlamadığı ilanlar
    hakemZaman: null,
    torbaBitti: false,     // son sayı çıktı, ek süre işliyor
    bitisZaman: null,
    cezaBitis: 0,          // yanlış ilan cezası bu ana kadar sürer
    cezaSayac: null,
    zaman: null,
    botZamanlari: new Set(),
    duraklat: false,
    bitti: false,
  };

  const ben = () => O.oyuncular.find((o) => o.id === BEN);
  const oyuncu = (id) => O.oyuncular.find((o) => o.id === id);
  const adiyla = (id) => (id === BEN ? 'Sen' : (oyuncu(id)?.ad || '?'));
  const botTanim = (i) => ({ ad: BOT_ADLARI[i], avatar: BOT_YUZLERI[i], renk: BOT_RENKLERI[i] });

  /* ===================== Yardımcılar ===================== */

  function ekranGoster(id) {
    document.querySelectorAll('.ekran').forEach((e) => {
      e.classList.toggle('ekran--acik', e.id === id);
    });
  }

  let bildirimZaman;
  function bildir(mesaj, kotu = false) {
    const el = $('#bildirim');
    el.textContent = mesaj;
    el.classList.toggle('kotu', kotu);
    el.classList.add('acik');
    clearTimeout(bildirimZaman);
    bildirimZaman = setTimeout(() => el.classList.remove('acik'), 2400);
  }

  function sonra(fn, ms) {
    const t = setTimeout(() => { O.botZamanlari.delete(t); fn(); }, ms);
    O.botZamanlari.add(t);
    return t;
  }
  function botZamanlariniSil() {
    O.botZamanlari.forEach(clearTimeout);
    O.botZamanlari.clear();
  }

  /* ===================== Kart ölçüsü ===================== */
  /* Kart hem genişliğe hem tahtada kalan boya göre ölçeklenir; mobilde
     ekranın boşta kalan yerini doldurur ama asla taşmaz. */

  function kartOlcule() {
    const tahta = $('.tahta');
    const kart = $('#kart');
    if (!tahta || !kart || !tahta.clientWidth) return;

    const ipucuBoy = $('#ipucu').offsetHeight + 8;
    const enAlan = tahta.clientWidth;
    const boyAlan = Math.max(tahta.clientHeight - ipucuBoy, 80);

    const endenHucre = (enAlan - 2 * KART_KENAR - (SUTUN - 1) * KART_BOSLUK) / SUTUN;
    const boydanHucre = (boyAlan - 2 * KART_KENAR - (SATIR - 1) * KART_BOSLUK) / (SATIR * HUCRE_ORAN);
    const hucre = Math.max(18, Math.min(endenHucre, boydanHucre, HUCRE_EN_BUYUK));
    const kartEn = hucre * SUTUN + (SUTUN - 1) * KART_BOSLUK + 2 * KART_KENAR;

    kart.style.setProperty('--kart-en', `${Math.floor(kartEn)}px`);
    kart.style.setProperty('--hucre-en', `${Math.floor(hucre)}px`);
  }

  const olcuTazele = () => requestAnimationFrame(kartOlcule);
  addEventListener('resize', olcuTazele);
  addEventListener('orientationchange', olcuTazele);

  /* ===================== Ana menü ===================== */

  function secimKur(id, anahtar, uygula) {
    const kutu = $(id);
    kutu.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      [...kutu.children].forEach((x) => x.classList.toggle('secili', x === b));
      const deger = b.dataset.deger;
      ayarlar[anahtar] = (anahtar === 'hiz' || anahtar === 'rakip') ? Number(deger) : deger;
      localStorage.setItem('tombala.' + anahtar, deger);
      uygula(deger);
      sfx.dokun();
    });
    [...kutu.children].forEach((b) => {
      b.classList.toggle('secili', b.dataset.deger === String(ayarlar[anahtar]));
    });
  }

  secimKur('#secim-rakip', 'rakip', () => {});
  secimKur('#secim-hiz', 'hiz', () => {});
  secimKur('#secim-isaret', 'isaret', () => {});
  secimKur('#secim-ses', 'ses', (v) => sesiAyarla(v === 'acik', true));

  // kullanici=true ise ses motoru hemen açılır. Açılışta çağrıldığında
  // açmıyoruz: dokunuş öncesi AudioContext kurmak tarayıcıda uyarı üretir.
  function sesiAyarla(acikMi, kullanici = false) {
    sesAcik = acikMi;
    ayarlar.ses = acikMi ? 'acik' : 'kapali';
    localStorage.setItem('tombala.ses', ayarlar.ses);
    $('#btn-ses').textContent = acikMi ? '🔊' : '🔇';
    [...$('#secim-ses').children].forEach((b) => {
      b.classList.toggle('secili', b.dataset.deger === ayarlar.ses);
    });
    if (acikMi && kullanici) sesiAc();
  }

  $('#btn-ses').onclick = () => { sesiAyarla(!sesAcik, true); if (sesAcik) sfx.dokun(); };

  $('#btn-basla').onclick = lobiyeGec;
  $('#btn-lobi-geri').onclick = () => { ekranGoster('ekran-menu'); sfx.dokun(); };
  $('#btn-oyunu-baslat').onclick = oyunuBaslat;
  $('#btn-menu').onclick = () => { oyunuBirak(); lobiyeGec(); sfx.dokun(); };
  $('#btn-anamenu').onclick = () => { perdeKapat(); oyunuBirak(); lobiyeGec(); };
  $('#btn-tekrar').onclick = () => { perdeKapat(); oyunuBaslat(); };
  $('#btn-cek').onclick = () => { if (!O.bitti) sayiCek(); };
  document.querySelectorAll('[data-ilan]').forEach((b) => {
    b.onclick = () => {
      const tur = b.dataset.ilan;
      if (!ilanEdilebilir(tur)) return;
      sfx.dokun();
      ilanEt(BEN, tur);
    };
  });
  $('#btn-durdur').onclick = duraklatDegistir;

  /* ===================== Lobi ===================== */

  function lobiyeGec() {
    if (!L.kart) L.kart = kartUret();
    $('#in-ad').value = profil.ad;
    seciciCiz();
    lobiTazele();
    ekranGoster('ekran-lobi');
  }

  function seciciCiz() {
    const av = $('#avatar-secici');
    const rn = $('#renk-secici');
    av.innerHTML = '';
    rn.innerHTML = '';
    for (const a of AVATARLAR) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = a;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', 'Simge ' + a);
      b.setAttribute('aria-checked', String(a === profil.avatar));
      b.className = a === profil.avatar ? 'secili' : '';
      b.onclick = () => {
        profil.avatar = a;
        localStorage.setItem('tombala.avatar', a);
        seciciCiz();
        lobiTazele();
        sfx.dokun();
      };
      av.append(b);
    }
    for (const r of RENKLER) {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.background = r;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', 'Renk');
      b.setAttribute('aria-checked', String(r === profil.renk));
      b.className = r === profil.renk ? 'secili' : '';
      b.onclick = () => {
        profil.renk = r;
        localStorage.setItem('tombala.renk', r);
        seciciCiz();
        lobiTazele();
        sfx.dokun();
      };
      rn.append(b);
    }
  }

  $('#in-ad').addEventListener('input', (e) => {
    profil.ad = e.target.value.slice(0, 12);
    localStorage.setItem('tombala.ad', profil.ad);
    lobiTazele();
  });

  $('#btn-rastgele-kart').onclick = () => {
    L.kart = kartUret();
    L.kurulmus = false;
    lobiTazele();
    sfx.dokun();
    titre(10);
  };

  function lobiTazele() {
    onizlemeCiz($('#lobi-kart'), L.kart);
    $('#kart-durum').textContent = L.kurulmus ? 'Kendi kurduğun' : 'Rastgele';

    const liste = $('#lobi-oyuncular');
    liste.innerHTML = '';
    const satir = (ad, avatar, renk, etiket, hazir) => {
      const li = document.createElement('li');
      li.className = 'oyuncu-satir';
      li.innerHTML = `
        <span class="oyuncu-satir__yuz" style="background:${kacis(renk)}">${kacis(avatar)}</span>
        <span class="oyuncu-satir__ad">${kacis(ad)}</span>
        <span class="oyuncu-satir__etiket ${hazir ? 'hazir' : ''}">${kacis(etiket)}</span>`;
      liste.append(li);
    };
    satir(adim(), profil.avatar, profil.renk, 'kartın hazır', true);
    for (let i = 0; i < ayarlar.rakip; i++) {
      const b = botTanim(i);
      satir(b.ad, b.avatar, b.renk, 'hazır', true);
    }
    $('#lobi-sayi').textContent = `${1 + ayarlar.rakip}/${1 + ayarlar.rakip}`;
  }

  /** Kartı dokunulamaz biçimde çizer (lobi önizlemesi). */
  function onizlemeCiz(kutu, kart) {
    kutu.innerHTML = '';
    if (!kart) return;
    for (let r = 0; r < SATIR; r++) {
      for (let c = 0; c < SUTUN; c++) {
        const n = kart[r * SUTUN + c];
        const h = document.createElement('div');
        h.className = 'hucre' + (n === null ? ' hucre--bos' : '');
        if (n !== null) h.textContent = n;
        kutu.append(h);
      }
    }
  }

  /* ===================== Kart kurma çekmecesi ===================== */

  $('#btn-kart-kur').onclick = () => {
    L.secim = new Set(kartSayilari(L.kart));
    cekmeceCiz();
    $('#cekmece').hidden = false;
    sfx.dokun();
  };
  $('#btn-cekmece-kapat').onclick = () => { $('#cekmece').hidden = true; sfx.dokun(); };
  $('#btn-cekmece-temizle').onclick = () => { L.secim.clear(); cekmeceCiz(); sfx.dokun(); };
  $('#btn-cekmece-kaydet').onclick = () => {
    try {
      L.kart = Cekirdek.sayilardanKart([...L.secim]);
      L.kurulmus = true;
      $('#cekmece').hidden = true;
      lobiTazele();
      bildir('Kartın kaydedildi');
      sfx.cinko();
    } catch (e) {
      bildir(e.message, true);
      sfx.hata();
    }
  };

  function cekmeceCiz() {
    const izgara = $('#sayi-izgara');
    const bilgi = Cekirdek.secimIncele([...L.secim]);
    izgara.innerHTML = '';
    for (let c = 0; c < SUTUN; c++) {
      const sutun = document.createElement('div');
      sutun.className = 'sayi-sutun' + (bilgi.adet[c] > 3 ? ' dolu' : '');
      const [alt, ust] = sutunAraligi(c);
      for (let n = alt; n <= ust; n++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sayi' + (L.secim.has(n) ? ' secili' : '');
        b.textContent = n;
        b.onclick = () => {
          if (L.secim.has(n)) L.secim.delete(n);
          else if (L.secim.size >= KART_SAYI) {
            bildir('15 sayı doldu', true);
            return sfx.hata();
          } else L.secim.add(n);
          titre(8);
          sfx.isaret();
          cekmeceCiz();
        };
        sutun.append(b);
      }
      izgara.append(sutun);
    }
    $('#cekmece-sayac').textContent = bilgi.kalan > 0 ? `Kalan ${bilgi.kalan}` : 'Tamam';
    $('#cekmece-uyari').textContent = bilgi.sorunlar[0] || '';
    $('#btn-cekmece-kaydet').disabled = !bilgi.gecerli;
  }

  /* ===================== Oyun kurulumu ===================== */

  function oyuncuKur() {
    if (!L.kart) L.kart = kartUret();
    const liste = [{
      id: BEN, ad: adim(), avatar: profil.avatar, renk: profil.renk, bot: false,
      kart: L.kart, isaretli: new Set(),
    }];
    const kac = Math.max(0, Math.min(ayarlar.rakip, BOT_ADLARI.length));
    for (let i = 0; i < kac; i++) {
      liste.push({
        id: 'bot' + i,
        ad: BOT_ADLARI[i],
        avatar: BOT_YUZLERI[i],
        renk: BOT_RENKLERI[i],
        bot: true,
        // Tepki süresi çekiliş aralığına oranlı; her botun kendi temposu var.
        tepki: 0.16 + i * 0.07 + Math.random() * 0.12,
        kart: kartUret(),
        isaretli: new Set(),
      });
    }
    return liste;
  }

  function oyunuBaslat() {
    oyunuBirak();
    O.oyuncular = oyuncuKur();
    O.torba = torbaKur();
    O.cikanlar = [];
    O.kazananlar = { cinko1: [], cinko2: [], tombala: [] };
    O.tamSatirlar = [false, false, false];
    O.bekleyenIlanlar = [];
    O.cezaBitis = 0;
    O.torbaBitti = false;
    O.duraklat = false;
    O.bitti = false;

    ekranGoster('ekran-oyun');
    kartCiz();
    ekraniTazele();
    olcuTazele();
    $('#cikan').textContent = '—';
    $('#cikan').classList.add('bos');
    $('#btn-durdur').textContent = 'Duraklat';
    sfx.dokun();
    zamanKur();
  }

  function oyunuBirak() {
    zamanDurdur();
    botZamanlariniSil();
    clearTimeout(O.hakemZaman);
    clearTimeout(O.bitisZaman);
    clearInterval(O.cezaSayac);
    O.hakemZaman = null;
    O.bitisZaman = null;
    O.cezaSayac = null;
  }

  /* ===================== Çekiliş ===================== */

  function zamanKur() {
    zamanDurdur();
    if (O.bitti || O.duraklat) return;
    O.zaman = setTimeout(sayiCek, ayarlar.hiz);
  }

  function zamanDurdur() {
    clearTimeout(O.zaman);
    O.zaman = null;
  }

  function duraklatDegistir() {
    if (O.bitti) return;
    O.duraklat = !O.duraklat;
    $('#btn-durdur').textContent = O.duraklat ? 'Devam et' : 'Duraklat';
    if (O.duraklat) zamanDurdur(); else zamanKur();
    sfx.dokun();
    ekraniTazele();
  }

  function sayiCek() {
    if (O.bitti || !O.torba.length) return;

    const n = O.torba.pop();
    O.cikanlar.push(n);

    const tas = $('#cikan');
    tas.textContent = n;
    tas.classList.remove('bos', 'dus');
    void tas.offsetWidth;          // animasyonu yeniden tetikle
    tas.classList.add('dus');

    const torba = $('#torba');
    torba.classList.remove('sik');
    void torba.offsetWidth;
    torba.classList.add('sik');

    sfx.cek();
    titre(8);

    if (ayarlar.isaret === 'otomatik') isaretle(ben(), n, false);
    botlariCalistir(n);
    tamSatirlariTazele();

    tamSatirlariTazele();
    ekraniTazele();
    if (O.bitti) return;                                   // tombala oldu
    if (!O.torba.length) return sonTuruBaslat();            // son sayı da çıktı
    zamanKur();
  }

  /* ===================== Botlar ===================== */
  /* Botlar çıkan sayıyı kendi temposuyla işaretler; aralığın yarısını
     geçmezler, yani bir sonraki çekilişe sarkmazlar. */

  function botlariCalistir(n) {
    for (const o of O.oyuncular) {
      if (!o.bot || !o.kart.includes(n)) continue;
      const gecikme = Math.min(ayarlar.hiz * 0.55, ayarlar.hiz * o.tepki + rastgele(120));
      sonra(() => {
        if (O.bitti) return;
        isaretle(o, n, false);
        botIlanlari(o);
        ekraniTazele();
      }, gecikme);
    }
  }

  /* ===================== İşaretleme ===================== */

  function isaretle(o, n, sesVer = true) {
    if (!o || O.bitti) return false;
    if (o.isaretli.has(n) || !O.cikanlar.includes(n) || !o.kart.includes(n)) return false;
    o.isaretli.add(n);
    if (sesVer) { sfx.isaret(); titre(12); }
    return true;
  }

  $('#kart').addEventListener('click', (e) => {
    const hucre = e.target.closest('.hucre');
    if (!hucre || !hucre.dataset.sayi || O.bitti) return;
    const n = Number(hucre.dataset.sayi);
    const b = ben();
    if (b.isaretli.has(n)) return;

    if (!O.cikanlar.includes(n)) {
      bildir('Bu sayı henüz çıkmadı', true);
      sfx.hata();
      titre([15, 40, 15]);
      hucre.classList.remove('sars');
      void hucre.offsetWidth;
      hucre.classList.add('sars');
      return;
    }

    isaretle(b, n);
    tamSatirlariTazele();
    ekraniTazele();
  });

  /* ===================== Son tur ===================== */
  /* Torba bitince oyunu anında kapatmıyoruz: son çıkan sayı birinin kartını
     tamamlamış olabilir. Elle işaretlemede oyuncunun o sayıya dokunup ilan
     etmesi, botların da son işaretlerini yapması için kısa bir süre tanınır. */

  function sonTuruBaslat() {
    O.torbaBitti = true;
    zamanDurdur();
    ekraniTazele();
    clearTimeout(O.bitisZaman);
    O.bitisZaman = setTimeout(bitisiDene, Math.max(1800, ayarlar.hiz * 0.9));
  }

  function bitisiDene() {
    if (O.bitti) return;
    // Hakem hâlâ karar veriyorsa ya da sırada ilan varsa bekle.
    if (O.bekleyenIlanlar.length || O.hakemZaman) {
      O.bitisZaman = setTimeout(bitisiDene, 400);
      return;
    }
    oyunuBitir('torba');
  }

  /* ===================== İlan ve hakem ===================== */
  /* İlanı oyuncu yapar; hakem kısa bir gecikmeyle karara bağlar. Gecikme
     bilinçli: aynı çekilişte gelen ilanlar aynı partide değerlendirilsin ve
     paylaşılabilsin. Online modda bu gecikmenin yerini ağ gecikmesi alacak. */

  const HAKEM_GECIKME = 300;

  function ilanEt(oyuncuId, tur) {
    if (O.bitti) return;
    if (O.bekleyenIlanlar.some((i) => i.oyuncuId === oyuncuId)) return;  // sırada ilanı var
    O.bekleyenIlanlar.push({ oyuncuId, tur, cekilisNo: O.cikanlar.length, zaman: Date.now() });
    if (oyuncuId === BEN) bildir(ASAMA_ADI[tur] + ' ilan edildi');
    ilanlariTazele();
    if (!O.hakemZaman) O.hakemZaman = setTimeout(hakemCalistir, HAKEM_GECIKME);
  }

  function hakemCalistir() {
    O.hakemZaman = null;
    if (O.bitti || !O.bekleyenIlanlar.length) return;

    const { sonuclar, kazananlar, bitti } = Cekirdek.ilanlariCoz({
      ilanlar: O.bekleyenIlanlar,
      oyuncular: O.oyuncular,
      cikanlar: O.cikanlar,
      kazananlar: O.kazananlar,
    });
    O.bekleyenIlanlar = [];
    O.kazananlar = kazananlar;

    // Kendi ilanımın sonucu
    const benimki = sonuclar[BEN];
    if (benimki && !benimki.gecerli) {
      O.cezaBitis = Date.now() + Cekirdek.YANLIS_ILAN_CEZASI;
      bildir(benimki.sebep || 'Yanlış ilan', true);
      sfx.hata();
      titre([15, 40, 15]);
      cezaSayaciBaslat();
    }

    // Yeni kazanılan aşamaları duyur
    for (const tur of ASAMALAR) {
      const kazanan = O.kazananlar[tur];
      if (!kazanan.length) continue;
      if (!kazanan.some((id) => sonuclar[id]?.gecerli)) continue;   // bu turda kazanılmadı
      if (tur === 'tombala') break;
      const bendeMi = kazanan.includes(BEN);
      bildir(`${ASAMA_ADI[tur]}: ${kazanan.map(adiyla).join(', ')}`);
      if (bendeMi) { sfx.cinko(); titre(tur === 'cinko2' ? [30, 40, 30] : 30); }
      else { sfx.kaptirdi(); titre(10); }
    }

    ekraniTazele();
    if (bitti) return oyunuBitir('tombala');
    if (O.torbaBitti) {
      clearTimeout(O.bitisZaman);
      O.bitisZaman = setTimeout(bitisiDene, 600);
    }

    // Karar sonrası durum değişti: botlar yeni açılan aşamayı değerlendirsin.
    // Buna yalnızca işaretleme anında bakılırsa, işaretleyecek sayısı kalmayan
    // bot hak ettiği aşamayı hiç ilan edemiyor.
    for (const o of O.oyuncular) {
      if (!o.bot) continue;
      sonra(() => { if (!O.bitti) { botIlanlari(o); ekraniTazele(); } },
        ayarlar.hiz * o.tepki * 0.5);
    }
  }

  function cezaSayaciBaslat() {
    clearInterval(O.cezaSayac);
    O.cezaSayac = setInterval(() => {
      if (Date.now() >= O.cezaBitis || O.bitti) {
        clearInterval(O.cezaSayac);
        O.cezaSayac = null;
      }
      ekraniTazele();
    }, 500);
  }

  const cezali = () => O.cezaBitis > Date.now();

  /** Ben bu aşamayı şu an ilan edebilir miyim? */
  function ilanEdilebilir(tur) {
    if (O.bitti || cezali()) return false;
    if (O.kazananlar[tur].length) return false;
    if (tur === 'cinko2' && !O.kazananlar.cinko1.length) return false;
    if (O.bekleyenIlanlar.some((i) => i.oyuncuId === BEN)) return false;
    return Cekirdek.hakEdiyor(ben(), tur, O.cikanlar);
  }

  /** Botlar hak ettikleri en yüksek aşamayı ilan eder; yanlış ilan etmezler. */
  function botIlanlari(o) {
    if (O.bitti || O.bekleyenIlanlar.some((i) => i.oyuncuId === o.id)) return;
    for (const tur of ['tombala', 'cinko2', 'cinko1']) {
      if (O.kazananlar[tur].length) continue;
      if (tur === 'cinko2' && !O.kazananlar.cinko1.length) continue;
      if (O.kazananlar[tur].includes(o.id)) continue;
      if (Cekirdek.hakEdiyor(o, tur, O.cikanlar)) { ilanEt(o.id, tur); return; }
    }
  }

  function tamSatirlariTazele() {
    const b = ben();
    O.tamSatirlar = Cekirdek.degerlendir(b.kart, b.isaretli, O.cikanlar).satirlar;
  }

  function oyunuBitir(sebep) {
    O.bitti = true;
    oyunuBirak();
    hucreleriTazele();

    const kazananlar = O.kazananlar.tombala;
    const bendeMi = kazananlar.includes(BEN);
    const b = ben();
    const durum = Cekirdek.degerlendir(b.kart, b.isaretli, O.cikanlar);

    if (sebep === 'tombala') {
      $('#sonuc-baslik').textContent = bendeMi ? 'Tombala senin!' : 'Tombala kaçtı';
      $('#sonuc-yazi').textContent = bendeMi
        ? `${O.cikanlar.length} sayıda 15'i de topladın.`
        : `${kazananlar.map(adiyla).join(', ')} önce bitirdi. Sende ${durum.isaretli}/15.`;
      if (bendeMi) { sfx.tombala(); titre([50, 30, 50, 30, 90]); }
      else { sfx.kaptirdi(); titre([20, 60, 20]); }
    } else {
      $('#sonuc-baslik').textContent = 'Torba bitti';
      $('#sonuc-yazi').textContent = `90 sayı çıktı. Sende ${durum.isaretli}/15 işaretli.`;
    }

    $('#sonuc-liste').innerHTML = ASAMALAR.map((a) => `
      <div class="sonuc-satir">
        <span class="sonuc-satir__ad">${ASAMA_ADI[a]}</span>
        <span class="sonuc-satir__kim ${O.kazananlar[a].length ? '' : 'yok'}">${
          O.kazananlar[a].length ? kacis(O.kazananlar[a].map(adiyla).join(', ')) : 'kimse alamadı'
        }</span>
      </div>`).join('');

    $('#perde').hidden = false;
    ekraniTazele();
  }

  const perdeKapat = () => { $('#perde').hidden = true; };

  /* ===================== Çizim ===================== */

  function kartCiz() {
    const kutu = $('#kart');
    const kart = ben().kart;
    kutu.innerHTML = '';
    for (let r = 0; r < SATIR; r++) {
      for (let c = 0; c < SUTUN; c++) {
        const n = kart[r * SUTUN + c];
        if (n === null) {
          const bos = document.createElement('div');
          bos.className = 'hucre hucre--bos';
          kutu.append(bos);
          continue;
        }
        const h = document.createElement('button');
        h.type = 'button';
        h.className = 'hucre';
        h.textContent = n;
        h.dataset.sayi = n;
        h.dataset.satir = r;
        h.style.setProperty('--egim', `${(n % 9) - 4}deg`);
        kutu.append(h);
      }
    }
    hucreleriTazele();
  }

  function hucreleriTazele() {
    const b = ben();
    if (!b) return;
    document.querySelectorAll('#kart .hucre[data-sayi]').forEach((h) => {
      const n = Number(h.dataset.sayi);
      const r = Number(h.dataset.satir);
      const isaretli = b.isaretli.has(n);
      h.classList.toggle('isaretli', isaretli);
      h.classList.toggle('cikti', !isaretli && !O.bitti && O.cikanlar.includes(n));
      h.classList.toggle('satir-tam', O.tamSatirlar[r]);
      h.setAttribute('aria-label', isaretli ? `${n}, işaretli` : String(n));
    });
  }

  function ilanlariTazele() {
    const bekleyenim = O.bekleyenIlanlar.some((i) => i.oyuncuId === BEN);
    document.querySelectorAll('[data-ilan]').forEach((b) => {
      const tur = b.dataset.ilan;
      const kazanan = O.kazananlar[tur];
      const alindi = kazanan.length > 0;
      const acik = ilanEdilebilir(tur);

      b.disabled = !acik;
      b.classList.toggle('hazir', acik);
      b.classList.toggle('alindi', alindi);
      b.classList.toggle('bende', alindi && kazanan.includes(BEN));
      b.classList.toggle('bekliyor', bekleyenim && !alindi);
      b.textContent = alindi
        ? `${ASAMA_ADI[tur]} · ${kazanan.map(adiyla).join(', ')}`
        : ASAMA_ADI[tur];
    });
  }

  function oyuncularCiz() {
    const kutu = $('#oyuncular');
    kutu.hidden = O.oyuncular.length < 2;
    if (kutu.hidden) { kutu.innerHTML = ''; return; }
    kutu.innerHTML = '';
    for (const o of O.oyuncular) {
      const d = Cekirdek.degerlendir(o.kart, o.isaretli, O.cikanlar);
      const kazandigi = ASAMALAR.filter((a) => O.kazananlar[a].includes(o.id)).length;
      const cip = document.createElement('div');
      cip.className = 'ocip' + (o.id === BEN ? ' ocip--ben' : '');
      cip.innerHTML = `
        <span class="ocip__yuz" style="background:${kacis(o.renk)}">${kacis(o.avatar)}</span>
        <span class="ocip__ad">${kacis(o.id === BEN ? 'Sen' : o.ad)}</span>
        <span class="ocip__bar"><i style="width:${(d.isaretli / KART_SAYI) * 100}%"></i></span>
        ${kazandigi ? `<span class="ocip__yildiz">${'★'.repeat(kazandigi)}</span>` : ''}`;
      kutu.append(cip);
    }
  }

  function sonlariCiz() {
    const kutu = $('#sonlar');
    kutu.innerHTML = '';
    // en son çıkan büyük taşta duruyor; şeritte ondan öncekiler var
    O.cikanlar.slice(-6, -1).reverse().forEach((n) => {
      const t = document.createElement('span');
      t.className = 'tas';
      t.textContent = n;
      kutu.append(t);
    });
  }

  function ekraniTazele() {
    $('#sayi-cikan').textContent = O.cikanlar.length;
    $('#sayi-kalan').textContent = O.torba.length;
    sonlariCiz();
    hucreleriTazele();
    ilanlariTazele();
    oyuncularCiz();

    let ipucu = '';
    if (O.bitti) ipucu = '';
    else if (cezali()) ipucu = `Yanlış ilan — ${Math.ceil((O.cezaBitis - Date.now()) / 1000)} sn bekle`;
    else if (O.torbaBitti) ipucu = 'Torba bitti — son ilanlar';
    else if (O.duraklat) ipucu = 'Duraklatıldı';
    else if (ayarlar.isaret === 'elle') ipucu = 'Çıkan sayılara dokunarak işaretle';
    else ipucu = 'Sayılar otomatik işaretleniyor';
    $('#ipucu').textContent = ipucu;

    $('#btn-cek').disabled = O.bitti || !O.torba.length;
    $('#btn-durdur').disabled = O.bitti;
  }

  /* ===================== Açılış ===================== */
  sesiAyarla(sesAcik);
})();
