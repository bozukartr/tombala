/* firebase-oda.js — çevrimiçi oda taşıma katmanı.
 *
 * app.js bu dosyayı yalnızca çevrimiçi moda geçilirken dinamik import ile
 * yükler. Böylece botlu yerel mod hiçbir ağ bağımlılığı taşımaz ve oyun
 * file:// üzerinden de açılabilir.
 *
 * Oyun kuralları burada YOK. Bu katman yalnızca veri taşır; hak ediş, ilan
 * doğrulama ve hakem app.js'teki çekirdekte durur ve host tarafında çalışır.
 *
 * Veri şeması:
 *   odalar/{kod}
 *     meta       { hostId, durum, kuruldu, ayarlar:{hiz, isaret} }
 *     oyuncular/{uid}  { ad, avatar, renk, hazir, kart, isaretli, bagli, katildi }
 *     oyun       { cikanlar, sonSayi, cekildi }
 *     ilanlar/{uid}    { tur, cekilisNo, zaman, gecerli, sebep }
 *     kazananlar { cinko1, cinko2, tombala }
 *
 * Realtime Database null değerleri sildiği için diziler virgüllü metin olarak
 * saklanır (kart, isaretli, cikanlar, kazananlar).
 */

// Üretimde SDK CDN'den gelir. Test ortamı ?sdk=/vendor/ ile yerel bir kopyayı
// gösterebilir; oyun kodu her iki durumda da aynı yolu izler.
const SDK = new URLSearchParams(location.search).get('sdk')
  || 'https://www.gstatic.com/firebasejs/10.12.5/';

export const EN_COK_OYUNCU = 6;
export const ODA_OMRU_MS = 6 * 60 * 60 * 1000;

let fb = null;      // yüklenen SDK modülleri
let uygulama = null;
let auth = null;
let db = null;
let benimUid = null;
let varlikRef = null;

const emulatorMu = () =>
  new URLSearchParams(location.search).get('emulator') === '1';

/** SDK'yı ve uygulamayı hazırlar. Birden çok çağrı zararsız. */
export async function baslat(config) {
  if (fb) return;
  if (SDK.endsWith('.js')) {
    // Tek dosyalık yerel paket (test ortamı): app, auth ve database aynı
    // modülde. Ayrı ayrı paketlenirse her biri kendi @firebase/app kopyasını
    // taşır ve auth kaydı tutmaz.
    fb = await import(SDK);
  } else {
    const [app, authMod, dbMod] = await Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-auth.js'),
      import(SDK + 'firebase-database.js'),
    ]);
    fb = { ...app, ...authMod, ...dbMod };
  }

  const ayar = { ...config };
  if (emulatorMu()) {
    // Emulator kendi projesiyle çalışır; jetonun aud alanı da ona uymalı.
    ayar.projectId = 'tombala';
    ayar.databaseURL = 'http://127.0.0.1:9000?ns=tombala';
  }

  uygulama = fb.initializeApp(ayar);
  auth = fb.getAuth(uygulama);
  db = fb.getDatabase(uygulama);

  if (emulatorMu()) {
    fb.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
}

/* ===================== Giriş ===================== */

const kullaniciBilgisi = (u) => (u ? {
  uid: u.uid,
  ad: u.displayName || '',
  anonim: u.isAnonymous,
  foto: u.photoURL || '',
} : null);

function uidBekle() {
  return new Promise((res, rej) => {
    const dur = fb.onAuthStateChanged(auth, (u) => {
      if (u) { dur(); benimUid = u.uid; res(kullaniciBilgisi(u)); }
    }, rej);
  });
}

export async function girisAnonim() {
  await fb.signInAnonymously(auth);
  return uidBekle();
}

export async function girisGoogle() {
  const saglayici = new fb.GoogleAuthProvider();
  await fb.signInWithPopup(auth, saglayici);
  return uidBekle();
}

export async function cikis() {
  await fb.signOut(auth);
  benimUid = null;
}

export function mevcutKullanici() {
  return kullaniciBilgisi(auth?.currentUser);
}

export const uid = () => benimUid;

/** Sayfa açılışında önceki oturumu geri getirir; yoksa null. */
export function oturumuBekle() {
  return new Promise((res) => {
    const dur = fb.onAuthStateChanged(auth, (u) => {
      dur();
      benimUid = u ? u.uid : null;
      res(kullaniciBilgisi(u));
    });
  });
}

/* ===================== Kodlama ===================== */

export const kartiYaz = (kart) => kart.map((v) => v ?? 0).join(',');
export const kartiOku = (m) => {
  if (Array.isArray(m)) return m;
  if (typeof m !== 'string' || !m) return null;
  const g = m.split(',').map((v) => Number(v) || null);
  return g.length === 27 ? g : null;
};
const sayiListesiYaz = (l) => [...(l || [])].join(',');
const sayiListesiOku = (m) =>
  (typeof m === 'string' && m ? m.split(',').filter(Boolean).map(Number) : []);

const yol = (...p) => p.join('/');

/** Ham anlık görüntüyü app.js'in beklediği biçime çevirir. */
function normalize(kod, ham) {
  if (!ham || !ham.meta) return null;
  const oyuncular = {};
  for (const [id, o] of Object.entries(ham.oyuncular || {})) {
    oyuncular[id] = {
      ...o,
      kart: o.kart ? kartiOku(o.kart) : null,
      isaretli: sayiListesiOku(o.isaretli),
      hazir: !!o.hazir,
      bagli: o.bagli !== false,
    };
  }
  return {
    kod,
    meta: ham.meta,
    oyuncular,
    oyun: {
      cikanlar: sayiListesiOku(ham.oyun?.cikanlar),
      sonSayi: ham.oyun?.sonSayi ?? null,
      cekildi: ham.oyun?.cekildi ?? 0,
    },
    ilanlar: ham.ilanlar || {},
    kazananlar: {
      cinko1: sayiListesiOkuId(ham.kazananlar?.cinko1),
      cinko2: sayiListesiOkuId(ham.kazananlar?.cinko2),
      tombala: sayiListesiOkuId(ham.kazananlar?.tombala),
    },
  };
}
const sayiListesiOkuId = (m) =>
  (typeof m === 'string' && m ? m.split(',').filter(Boolean) : []);
const idListesiYaz = (l) => [...(l || [])].join(',');

/* ===================== Oda ===================== */

const rastgeleKod = () => String(Math.floor(10000 + Math.random() * 90000));

/**
 * Oda kurar. Kod çakışmasını işlem (transaction) ile önler.
 * Oyuncu düğümü meta'dan ÖNCE yazılır: kural, hostId'nin odadaki bir
 * oyuncuya işaret etmesini şart koşuyor.
 */
export async function odaKur(profil, ayarlar) {
  for (let deneme = 0; deneme < 6; deneme++) {
    const kod = rastgeleKod();
    const benimYol = yol('odalar', kod, 'oyuncular', benimUid);

    await fb.set(fb.ref(db, benimYol), oyuncuKaydi(profil, true));

    const meta = {
      hostId: benimUid,
      durum: 'lobi',
      kuruldu: Date.now(),
      ayarlar: { hiz: ayarlar?.hiz ?? 3500, isaret: ayarlar?.isaret ?? 'elle' },
    };
    const sonuc = await fb.runTransaction(fb.ref(db, yol('odalar', kod, 'meta')), (cur) => {
      if (cur && Date.now() - (cur.kuruldu || 0) < ODA_OMRU_MS) return;   // dolu
      return meta;
    });

    if (sonuc.committed) {
      await fb.set(fb.ref(db, yol('odalar', kod, 'oyun')), { cikanlar: '', sonSayi: 0, cekildi: 0 });
      await fb.set(fb.ref(db, yol('odalar', kod, 'kazananlar')), { cinko1: '', cinko2: '', tombala: '' });
      varligiKur(kod);
      return kod;
    }
    await fb.remove(fb.ref(db, benimYol));   // kod tutmadı, izini sil
  }
  throw new Error('Oda kodu üretilemedi, tekrar dene');
}

function oyuncuKaydi(profil, hazir = false) {
  return {
    ad: (profil.ad || 'Oyuncu').slice(0, 12),
    avatar: (profil.avatar || '🎯').slice(0, 4),
    renk: /^#[0-9a-fA-F]{6}$/.test(profil.renk || '') ? profil.renk : '#ffb43d',
    hazir,
    kart: profil.kart ? kartiYaz(profil.kart) : '',
    isaretli: '',
    bagli: true,
    katildi: Date.now(),
  };
}

export async function odayaKatil(kod, profil) {
  if (!/^\d{5}$/.test(kod)) throw new Error('Oda kodu 5 haneli olmalı');
  const anlik = await fb.get(fb.ref(db, yol('odalar', kod)));
  const ham = anlik.val();
  if (!ham?.meta) throw new Error('Oda bulunamadı');
  if (Date.now() - (ham.meta.kuruldu || 0) > ODA_OMRU_MS) throw new Error('Oda bulunamadı');

  const oyuncular = ham.oyuncular || {};
  const geriDonus = !!oyuncular[benimUid];
  if (!geriDonus) {
    if (Object.keys(oyuncular).length >= EN_COK_OYUNCU) throw new Error('Oda dolu');
    if (ham.meta.durum !== 'lobi') throw new Error('Bu oyun çoktan başladı');
  }

  const benimRef = fb.ref(db, yol('odalar', kod, 'oyuncular', benimUid));
  if (geriDonus) {
    await fb.update(benimRef, {
      bagli: true,
      ad: (profil.ad || 'Oyuncu').slice(0, 12),
      avatar: (profil.avatar || '🎯').slice(0, 4),
      renk: profil.renk,
    });
  } else {
    await fb.set(benimRef, oyuncuKaydi(profil));
  }
  varligiKur(kod);
  return kod;
}

/** Bağlantı koparsa sunucu bagli=false yazsın. */
function varligiKur(kod) {
  varlikRef = fb.ref(db, yol('odalar', kod, 'oyuncular', benimUid, 'bagli'));
  fb.onDisconnect(varlikRef).set(false);
}

export function odayiDinle(kod, geriCagri) {
  return fb.onValue(fb.ref(db, yol('odalar', kod)), (anlik) => {
    geriCagri(normalize(kod, anlik.val()));
  });
}

export const beniGuncelle = (kod, yama) => {
  const y = { ...yama };
  if (y.kart !== undefined) y.kart = y.kart ? kartiYaz(y.kart) : '';
  if (y.isaretli !== undefined) y.isaretli = sayiListesiYaz(y.isaretli);
  return fb.update(fb.ref(db, yol('odalar', kod, 'oyuncular', benimUid)), y);
};

export const metaGuncelle = (kod, yama) =>
  fb.update(fb.ref(db, yol('odalar', kod, 'meta')), yama);

export const cekilisYaz = (kod, cikanlar, sonSayi) =>
  fb.update(fb.ref(db, yol('odalar', kod, 'oyun')), {
    cikanlar: sayiListesiYaz(cikanlar),
    sonSayi,
    cekildi: Date.now(),
  });

export const ilanGonder = (kod, tur, cekilisNo) =>
  fb.set(fb.ref(db, yol('odalar', kod, 'ilanlar', benimUid)), {
    tur, cekilisNo, zaman: Date.now(),
  });

export const ilanSonucu = (kod, id, gecerli, sebep) =>
  fb.update(fb.ref(db, yol('odalar', kod, 'ilanlar', id)), {
    gecerli, sebep: sebep || null,
  });

export const ilaniSil = (kod, id) =>
  fb.remove(fb.ref(db, yol('odalar', kod, 'ilanlar', id)));

export const kazananlariYaz = (kod, kazananlar) =>
  fb.set(fb.ref(db, yol('odalar', kod, 'kazananlar')), {
    cinko1: idListesiYaz(kazananlar.cinko1),
    cinko2: idListesiYaz(kazananlar.cinko2),
    tombala: idListesiYaz(kazananlar.tombala),
  });

/** Yeni tur: oda düzeyindeki düğümler sıfırlanır. */
export const turuSifirla = (kod) =>
  fb.update(fb.ref(db, yol('odalar', kod)), {
    oyun: { cikanlar: '', sonSayi: 0, cekildi: 0 },
    kazananlar: { cinko1: '', cinko2: '', tombala: '' },
    ilanlar: null,
    'meta/durum': 'lobi',
  });

export async function odadanCik(kod) {
  if (varlikRef) {
    try { await fb.onDisconnect(varlikRef).cancel(); } catch { /* zaten kopmuş */ }
    varlikRef = null;
  }
  await fb.remove(fb.ref(db, yol('odalar', kod, 'oyuncular', benimUid)));
}

/**
 * Host koptuysa ya da odadan çıktıysa en erken katılan bağlı oyuncu devralır.
 * İşlemle yapılır ki iki kişi aynı anda devralmasın.
 */
export async function hostDevralmayiDene(kod, oda) {
  const host = oda.oyuncular[oda.meta.hostId];
  if (host?.bagli) return false;
  const ayakta = Object.entries(oda.oyuncular)
    .filter(([, o]) => o.bagli)
    .sort((a, b) => (a[1].katildi || 0) - (b[1].katildi || 0));
  if (!ayakta.length || ayakta[0][0] !== benimUid) return false;
  const sonuc = await fb.runTransaction(
    fb.ref(db, yol('odalar', kod, 'meta', 'hostId')),
    (cur) => (cur === oda.meta.hostId ? benimUid : undefined),
  );
  return sonuc.committed;
}
