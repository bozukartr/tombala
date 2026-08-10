/* Tombala — tek dosya oyun mantığı.
   Modül kullanmıyoruz; dosya file:// üzerinden de açılabilsin diye düz script. */
(() => {
  'use strict';

  /* ===================== Sabitler ===================== */
  const SATIR = 3;
  const SUTUN = 9;
  const SATIR_BASI = 5;   // her satırda kaç sayı
  const KART_SAYI = 15;   // karttaki toplam sayı
  const EN_BUYUK = 90;

  const $ = (s) => document.querySelector(s);

  /* ===================== Kart üretimi ===================== */

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

  const satirSayilari = (kart, r) =>
    kart.slice(r * SUTUN, r * SUTUN + SUTUN).filter((v) => v !== null);

  const kartSayilari = (kart) => kart.filter((v) => v !== null);

  /* ===================== Durum ===================== */

  const ayarlar = {
    hiz: Number(localStorage.getItem('tombala.hiz')) || 3500,
    isaret: localStorage.getItem('tombala.isaret') || 'elle',
  };

  const O = {
    kart: null,
    isaretli: new Set(),
    torba: [],       // henüz çıkmamış sayılar
    cikanlar: [],    // çıkış sırasıyla
    son: null,
    asama: 0,        // 0 yok, 1 çinko1, 2 çinko2, 3 tombala
    tamSatirlar: [false, false, false],
    zaman: null,
    duraklat: false,
    bitti: false,
  };

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

  /* ===================== Ana menü ===================== */

  function secimKur(id, anahtar, uygula) {
    const kutu = $(id);
    kutu.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      [...kutu.children].forEach((x) => x.classList.toggle('secili', x === b));
      const deger = b.dataset.deger;
      localStorage.setItem('tombala.' + anahtar, deger);
      uygula(deger);
    });
    // kayıtlı ayarı işaretle
    [...kutu.children].forEach((b) => {
      b.classList.toggle('secili', b.dataset.deger === String(ayarlar[anahtar]));
    });
  }

  secimKur('#secim-hiz', 'hiz', (v) => { ayarlar.hiz = Number(v); });
  secimKur('#secim-isaret', 'isaret', (v) => { ayarlar.isaret = v; });

  $('#btn-basla').onclick = oyunuBaslat;
  $('#btn-menu').onclick = () => { zamanDurdur(); ekranGoster('ekran-menu'); };
  $('#btn-anamenu').onclick = () => { perdeKapat(); zamanDurdur(); ekranGoster('ekran-menu'); };
  $('#btn-tekrar').onclick = () => { perdeKapat(); oyunuBaslat(); };
  $('#btn-cek').onclick = () => { if (!O.bitti) sayiCek(); };
  $('#btn-durdur').onclick = duraklatDegistir;

  /* ===================== Oyun kurulumu ===================== */

  function oyunuBaslat() {
    zamanDurdur();
    O.kart = kartUret();
    O.isaretli = new Set();
    O.torba = karistir(Array.from({ length: EN_BUYUK }, (_, i) => i + 1));
    O.cikanlar = [];
    O.son = null;
    O.asama = 0;
    O.tamSatirlar = [false, false, false];
    O.duraklat = false;
    O.bitti = false;

    kartCiz();
    ekraniTazele();
    ekranGoster('ekran-oyun');
    $('#cikan').textContent = '—';
    $('#cikan').classList.add('bos');
    $('#btn-durdur').textContent = 'Duraklat';
    zamanKur();
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
    ekraniTazele();
  }

  function sayiCek() {
    if (O.bitti || !O.torba.length) return;

    const n = O.torba.pop();
    O.cikanlar.push(n);
    O.son = n;

    const tas = $('#cikan');
    tas.textContent = n;
    tas.classList.remove('bos', 'dus');
    void tas.offsetWidth;         // animasyonu yeniden tetikle
    tas.classList.add('dus');

    const torba = $('#torba');
    torba.classList.remove('sik');
    void torba.offsetWidth;
    torba.classList.add('sik');

    if (ayarlar.isaret === 'otomatik' && O.kart.includes(n)) {
      O.isaretli.add(n);
    }

    ekraniTazele();
    asamaKontrol();
    if (O.bitti) return;                                  // tombala oldu
    if (!O.torba.length) return oyunuBitir('torba');       // son sayı da çıktı
    zamanKur();
  }

  /* ===================== İşaretleme ===================== */

  $('#kart').addEventListener('click', (e) => {
    const hucre = e.target.closest('.hucre');
    if (!hucre || !hucre.dataset.sayi || O.bitti) return;
    const n = Number(hucre.dataset.sayi);

    if (O.isaretli.has(n)) return;

    if (!O.cikanlar.includes(n)) {
      bildir('Bu sayı henüz çıkmadı', true);
      hucre.classList.remove('sars');
      void hucre.offsetWidth;
      hucre.classList.add('sars');
      return;
    }

    O.isaretli.add(n);
    ekraniTazele();
    asamaKontrol();
  });

  /* ===================== Kazanma ===================== */

  function tamamlananSatirlar() {
    const bitmis = [];
    for (let r = 0; r < SATIR; r++) {
      bitmis.push(satirSayilari(O.kart, r).every((n) => O.isaretli.has(n)));
    }
    return bitmis;
  }

  function asamaKontrol() {
    const bitmis = tamamlananSatirlar();
    const adet = bitmis.filter(Boolean).length;
    const hepsi = kartSayilari(O.kart).every((n) => O.isaretli.has(n));

    O.tamSatirlar = bitmis;

    if (hepsi && O.asama < 3) {
      O.asama = 3;
      rozetleriTazele();
      return oyunuBitir('tombala');
    }
    if (adet >= 2 && O.asama < 2) {
      O.asama = 2;
      bildir('2. Çinko!');
    } else if (adet >= 1 && O.asama < 1) {
      O.asama = 1;
      bildir('1. Çinko!');
    }
    rozetleriTazele();
  }

  function oyunuBitir(sebep) {
    O.bitti = true;
    zamanDurdur();
    kartCiz();

    const kazanildi = sebep === 'tombala';
    $('#sonuc-baslik').textContent = kazanildi ? 'Tombala!' : 'Torba bitti';
    $('#sonuc-yazi').textContent = kazanildi
      ? `${O.cikanlar.length} sayıda 15'i de topladın.`
      : `90 sayı çıktı. ${O.isaretli.size}/15 işaretledin.`;
    $('#perde').hidden = false;
  }

  const perdeKapat = () => { $('#perde').hidden = true; };

  /* ===================== Çizim ===================== */

  function kartCiz() {
    const kutu = $('#kart');
    kutu.innerHTML = '';
    for (let r = 0; r < SATIR; r++) {
      for (let c = 0; c < SUTUN; c++) {
        const n = O.kart[r * SUTUN + c];
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
    document.querySelectorAll('#kart .hucre[data-sayi]').forEach((h) => {
      const n = Number(h.dataset.sayi);
      const r = Number(h.dataset.satir);
      const isaretli = O.isaretli.has(n);
      h.classList.toggle('isaretli', isaretli);
      h.classList.toggle('cikti', !isaretli && !O.bitti && O.cikanlar.includes(n));
      h.classList.toggle('satir-tam', O.tamSatirlar[r]);
      h.setAttribute('aria-label', isaretli ? `${n}, işaretli` : String(n));
    });
  }

  function rozetleriTazele() {
    $('#rozet-cinko1').classList.toggle('alindi', O.asama >= 1);
    $('#rozet-cinko2').classList.toggle('alindi', O.asama >= 2);
    const t = $('#rozet-tombala');
    t.classList.toggle('alindi', O.asama >= 3);
    t.classList.toggle('tombala', O.asama >= 3);
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
    rozetleriTazele();

    let ipucu = '';
    if (O.bitti) ipucu = '';
    else if (O.duraklat) ipucu = 'Duraklatıldı';
    else if (ayarlar.isaret === 'elle') ipucu = 'Çıkan sayılara dokunarak işaretle';
    else ipucu = 'Sayılar otomatik işaretleniyor';
    $('#ipucu').textContent = ipucu;

    $('#btn-cek').disabled = O.bitti || !O.torba.length;
    $('#btn-durdur').disabled = O.bitti;
  }
})();
