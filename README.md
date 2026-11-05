# tombala.

2–4 kişilik, Türkçe, ailece oynanan çevrimiçi tombala. HTML, CSS ve JavaScript; derleme veya arayüz çatısı gerektirmez.

![Dört oyuncunun kartlarının birlikte görüldüğü mobil masa](docs/mobile-preview.png)

## Kartlar ve oyun

- Gerçek kart referanslarındaki 3×9 yerleşim. Sol ortadaki hücre kart kimliğidir; oyun sayısı değildir.
- Her satırda 5, toplam 15 benzersiz oyun sayısı; sütun başına 1–2 sayı. Aralıklar 1–9, 10–19, …, 70–79 ve 80–90.
- Referanslardaki iki boşluk ailesi ve üst/alt satır dönüşümleri kullanılır. Sayılar sütun içinde yukarıdan aşağı sıralanmaz.
- Oda içinde kart kimlikleri koltuklara göre 01–04'tür. Lobide rastgele kart, seçenekler arasından seçim ve kendi sayılarını yazma bulunur.
- Herkes tüm oyuncuların kartlarını ve işaretlemelerini canlı görür. Yalnızca kendi kartına dokunabilir.
- Otomatik işaretleme yoktur. Torbadan çıkan bir oyun sayısı, oyuncu dokunup Firebase'e kaydedilince bulunmuş sayılır. İşaretleme geri alınmaz.
- Bir satırı ilk işaretleyen 1. çinkoyu, iki satırı ilk işaretleyen 2. çinkoyu, kartın tamamını ilk işaretleyen tombalayı alır. İlan düğmesi gerekmez; tamamlayıcı dokunuş aşamayı kaydeder.
- İşaretleme ve ödül kararı tek oda transaction'ında kaydedilir. Firebase'de önce kabul edilen tamamlayıcı işlem kazanır; istemci saati kullanılmaz ve ortak kazanan oluşturulmaz.
- Çinko/tombala kazananı bütün ekranlarda animasyonlu bildirimle gösterilir; kazanan kart ve tamamlanan satır vurgulanır. Yenilemede eski kutlamalar yeniden oynatılmaz. Azaltılmış hareket tercihi desteklenir.
- Oda sahibi sayıları tek tek veya beş saniyede bir otomatik çekebilir. 90 sayının çekilmesi kartları doldurmaz; oyun manuel tombala tamamlanana kadar sürer.
- “Tekrar oyna” aynı odanın lobisine döndürür, herkesin işaretlerini ve ödülleri temizler; kart seçimi ve hazır olma yeniden yapılır.
- Firebase anonim giriş, dört haneli oda kodu, dört koltuk, bağlantı takibi ve oda sahibi devri.
- Tam ekran mobil oyun kabuğu ve ana ekrana ekleme için PNG ikonları.

## Firebase kurulumu

Telefondan oyunun yayımlandığı adreste `kurulum.html` sayfasını aç: kuralları kopyala, Firebase panelinde Realtime Database → Kurallar bölümüne yapıştırıp yayımla, ardından bağlantıyı kontrol et. Kontrol yalnızca giriş ve okuma iznini sınar; yazma izni oda kurarken doğrulanır.

**Bu sürüm `tombalaV4` alanını kullanır. `database.rules.json` Firebase'e yayımlanmalı ve odalar yeniden kurulmalıdır. Önceki sürümlerin otomatik oyunlarıyla veri karıştırılmaz.**

`firebase-config.js`, mevcut `tombala-3d421` projesinin herkese açık web yapılandırmasıdır. Authentication → Sign-in method → Anonymous açık olmalıdır.

Bilgisayardan alternatif kurulum:

```sh
npm install
npx firebase login
npx firebase deploy --only database --project tombala-3d421
```

Kurallar oda listesini kapatır; kodu bilen oturumlar odayı okuyabilir. Kart/kimlik ve diğer oyuncuların işaretleri korunur. Manuel bir işlem yalnızca çıkan, kartta bulunan, daha önce işaretlenmemiş bir sayıyı ekleyebilir; satır sayaçları ve ilk kazanan kaydı aynı işlemde doğrulanır. Sayı çekilişini oda sahibi yönetir; ödüllü/rekabetçi kullanım için ayrıca sunucu hakemi gerekir.

Kuralların tekrar eden koltuk kontrolleri `scripts/build-rules.js` ile üretilir. Güncellemek için `npm run rules:build`; `npm run check` dosyanın üreticiyle aynı kaldığını doğrular.

Odalar altı saat geçerlidir. Süresi dolan veriler otomatik üzerine yazılmaz; uzun vadeli temizlik yönetici göreviyle yapılabilir.

## Yayınlama ve önizleme

Dosyalar GitHub Pages veya herhangi bir statik sunucuda repo kökünden yayımlanabilir. JavaScript modülleri HTTP(S) ister.

```sh
python3 -m http.server 8080
```

`http://localhost:8080/` gerçek Firebase'i kullanır. `?demo=1` örnek oyuncularla bellekte önizlemedir; canlı oda oluşturmaz. `scene=lobby`, `scene=game` veya `scene=results` ilgili ekranı açar. Oyun önizlemesi önceden yapılmış örnek manuel işaretlemeler içerir; devamında sayılara kendin dokunursun.

## Doğrulama

Node.js 22 ve Java 21 önerilir.

```sh
npm install
npm run check
npm test
npm run test:database
```

Oyun testleri gerçek kart örneklerini, kart kimliğini, 2.000 kartı, 100 manuel turu, ilk tamamlayanı ve kutlama tekrarlarını doğrular. Firebase Emulator testleri eşzamanlı katılımı, iki canlı dinleyiciyi, işaretleme sırasını, sahte ilerleme/ödül değişikliklerini, ilk çinko yarışını ve lobiye sıfırlamayı sınar. Emülatör testleri canlı veritabanına yazmaz.
