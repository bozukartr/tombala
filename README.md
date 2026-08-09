# Tombala

Mobil öncelikli, oda tabanlı Türk tombalası. Uygulama vanilla HTML, CSS ve
JavaScript ile çalışır; derleme adımı veya frontend framework yoktur. Çevrimiçi
oyun Firebase Anonymous Authentication ve Realtime Database kullanır.

## Özellikler

- 5 haneli oda koduyla 2–6 oyuncu
- Odaya girerken otomatik geçerli kart
- Rastgele kart yenileme veya 15 sayıyı elle seçme
- Otomatik/elle sayı çekme ve işaretleme
- 1. Çinko, 2. Çinko ve Tombala doğrulaması
- Host kopunca güvenli host devri
- Süresi dolmuş odaların atomik olarak yeniden kullanılması
- Tekrar oyna ve Firebase gerektirmeyen yerel bot modu
- Mobil safe-area, klavye ve dokunmatik ekran desteği

## Yeni Firebase projesini bağlama

1. [Firebase Console](https://console.firebase.google.com/) üzerinden yeni proje oluştur.
2. Projeye bir **Web app** ekle.
3. **Build → Authentication → Sign-in method** bölümünden **Anonymous** girişini aç.
4. **Build → Realtime Database → Create Database** ile veritabanını **Locked mode**'da oluştur.
5. Web app yapılandırma nesnesindeki değerleri eksiksiz olarak `firebase-config.js`
   dosyasına yapıştır. Özellikle konsolun verdiği `databaseURL` değerini aynen kullan.
6. Proje kimliğini ayarla:

   ```bash
   cp .firebaserc.example .firebaserc
   ```

   Ardından `.firebaserc` içindeki `BURAYA_PROJECT_ID` bölümünü değiştir.
7. Bağımlılıkları kur, kuralları test et ve yayınla:

   ```bash
   npm install
   npm test
   npm run deploy:rules
   ```

`firebase.json` repoda hazırdır; `npm run deploy:rules` yalnızca
`database.rules.json` dosyasını seçili projeye yükler. Firebase Console'da Rules
sekmesine elle farklı bir kural yazılırsa sonraki CLI deployment'ı onun üzerine
yazar.

## Yerelde çalıştırma

```bash
npm install
npm run serve
```

Ardından `http://localhost:5000` adresini aç. Firebase yapılandırması henüz
eklenmediyse **Tek cihazda dene** ile bütün oyun döngüsü oynanabilir.

## Yayınlama

### Firebase Hosting

```bash
npm run deploy
```

Bu komut statik uygulamayı ve Realtime Database kurallarını birlikte yayınlar.

### GitHub Pages

Repo ayarlarında **Pages → Deploy from a branch → main / root** seç. Sonra
Firebase Console'da **Authentication → Settings → Authorized domains** listesine
`KULLANICI.github.io` alan adını ekle.

## Güvenlik modeli

- Oda ilk kez tek atomik yazımla oluşturulur; yarım oda kalmaz.
- Aktif oda başka bir kullanıcı tarafından ezilemez.
- Süresi dolan oda sunucu saatine göre yeni host tarafından tamamen yenilenebilir.
- Oyuncu yalnızca kendi profilini, kartını, işaretlerini ve ilan isteğini yazar.
- Kart oyun başladıktan sonra değiştirilemez.
- Çekiliş, sonuç ve kazananları yalnızca host yazar.
- Oyuncu kendi ilanını onaylayamaz; ilan isteği ve host sonucu ayrı düğümlerdedir.
- Oda kodunu bilen anonim kullanıcı odayı okuyabilir. Oda kodu bir sır değil,
  kısa süreli davet anahtarıdır; hassas kişisel veri saklanmamalıdır.

Odalar altı saat geçerlidir. Host lobi veya sonuç ekranından ayrıldığında oda
silinir; beklenmeyen kapanmalardan kalan odalar süreleri dolduktan sonra aynı
kodla atomik olarak değiştirilebilir.

## Testler

```bash
npm run test:unit   # kart ve oyun motoru
npm run test:rules  # Firebase Realtime Database Emulator
npm test            # tamamı
```

GitHub Actions her pull request'te hem saf mantık hem güvenlik kuralı testlerini
çalıştırır.
