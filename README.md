# tombala.

2–4 kişilik, Türkçe, ailece oynanan çevrimiçi tombala; istersen botlarla tek başına. HTML, CSS ve JavaScript; derleme veya arayüz çatısı gerektirmez.

![Ana ekran, oyun masası, tur sonucu ve koyu tema](docs/mobile-preview.png)

## Oyun

- **Üç yol:** Oda kur, dört haneli kodla odaya katıl ya da **Botlarla** hemen başla. Botlarla oyun Firebase gerektirmez, internetsiz de açılır.
- **Kartlar:** Gerçek kart referanslarındaki 3×9 yerleşim. Sol ortadaki hücre kart kimliğidir; oyun sayısı değildir. Her satırda 5, toplam 15 benzersiz oyun sayısı; sütun başına 1–2 sayı. Aralıklar 1–9, 10–19, …, 70–79 ve 80–90. Lobide kartı yenileme, üç seçenekten seçme ve **kendi kartını oluşturma** bulunur: boşluk düzenini küçük önizlemelerden seç, karta dokun, alttaki tuş takımından o sütunun sayısını seç. Tuş takımı yalnızca geçerli sayıları gösterir, sıradaki boş kare kendiliğinden seçilir; “Rastgele tamamla” kalanları doldurur. Klavye ve hatalı giriş yoktur.
- **Çekiliş:** Oda sahibi lobide “Elle · 8 sn · 5 sn · 3 sn” seçer. Otomatik çekilişte topun çevresindeki halka bir sonraki sayıya kalan süreyi gösterir. Oyun sırasında duraklatabilir, hızı değiştirebilir veya istediği an sayı çekebilir.
- **Manuel işaretleme:** Otomatik işaretleme yoktur. Çıkan bir sayı, oyuncu kendi kartında dokunup kaydedilince bulunmuş sayılır; damga anında görünür, sonuç oda transaction'ından gelir. Henüz çıkmamış sayıya dokunmak titreşim ve uyarı verir.
- **Ödüller ve puan:** Bir satırı ilk tamamlayan 1. çinkoyu (+1), iki satırı ilk tamamlayan 2. çinkoyu (+2), kartın tamamını ilk işaretleyen tombalayı (+3) alır. Puanlar aynı odada turlar boyunca birikir ve lobide, sonuç ekranında puan tablosu olarak görünür.
- **Yakın kazanma:** Sıradaki ödüle tek işaret kalan oyuncunun kartında “1 kaldı” rozeti çıkar. Hesap yalnızca oyuncunun kendi işaretlerine bakar; çıkmış ama işaretlenmemiş sayıları ele vermez.
- **Ortak masa:** Herkes tüm kartları canlı görür. Rakiplerin kartları oyun ekranında küçük ama okunur sayılarla, işaretleri oyuncunun renginde görünür; dokununca kart büyür. Çekiliş topu üstte, kendi kartın altta sabit kalır; kısa ekranlarda rakipler ikisinin arasında kayar. Yalnızca kendi kartına dokunabilirsin.
- **Tepkiler:** 👏 🔥 😮 😂 🙈 tepkileri bütün ekranlarda yükselerek görünür. Botlar da ödüllere tepki verir.
- **Tur akışı:** Başlangıçta 3-2-1 geri sayımı, ödüllerde bütün ekranlarda bildirim, kazanan kartta parlama ve tombalada konfeti. “Tekrar oyna” aynı odanın lobisine döndürür; işaretler temizlenir, puanlar korunur.
- Firebase anonim giriş, dört haneli oda kodu, dört koltuk, bağlantı takibi ve oda sahibi devri.

## Mobil uygulama hissi

- Sade, büyük dokunma alanlı arayüz; sistemle uyumlu açık/koyu tema veya elle seçim.
- Ayarlar: ses efektleri, çıkan sayının Türkçe okunması (“kırk iki”), titreşim ve oyun sırasında ekranı açık tutma.
- Alttan açılan ve aşağı sürüklenerek kapanan sayfalar, ekranlar arası geçişler, azaltılmış hareket desteği.
- Ana ekrana eklenebilir PWA: uygulama ikonu, uzun basınca “Botlarla oyna” kısayolu ve çevrimdışı açılış için ağ öncelikli service worker.
- Botlarla oyunda uygulama arka plana geçince çekiliş ve botlar durur; dönünce kaldığı yerden sürer.

## Firebase kurulumu

**Bu sürüm `tombalaV5` (oda) ve `tombalaV5Reactions` (tepki) alanlarını kullanır. Güncel `database.rules.json` Firebase'e yayımlanmalı ve odalar yeniden kurulmalıdır. Botlarla oyun bu adımı beklemez.**

Telefondan oyunun yayımlandığı adreste `kurulum.html` sayfasını aç: kuralları kopyala, Firebase panelinde Realtime Database → Kurallar bölümüne yapıştırıp yayımla, ardından bağlantıyı kontrol et. Kontrol yalnızca giriş ve okuma iznini sınar; yazma izni oda kurarken doğrulanır.

`firebase-config.js`, mevcut `tombala-3d421` projesinin herkese açık web yapılandırmasıdır. Authentication → Sign-in method → Anonymous açık olmalıdır.

Bilgisayardan alternatif kurulum:

```sh
npm install
npx firebase login
npx firebase deploy --only database --project tombala-3d421
```

Kurallar oda listesini kapatır; kodu bilen oturumlar odayı okuyabilir. Kart/kimlik ve diğer oyuncuların işaretleri korunur. Manuel bir işlem yalnızca çıkan, kartta bulunan, daha önce işaretlenmemiş bir sayıyı ekleyebilir; satır sayaçları, ilk kazanan kaydı ve ödül puanı aynı işlemde doğrulanır. Puanı oda sahibi dahil kimse elle değiştiremez. Çekiliş hızı yalnızca oda sahibinin seçebileceği 0/3/5/8 saniye değerleridir. Tepkiler oda transaction'larıyla yarışmasın diye ayrı yolda tutulur; oyuncu yalnızca kendi koltuğuna, sunucu saatiyle ve en fazla 0,7 saniyede bir yazabilir. Sayı çekilişini oda sahibi yönetir; ödüllü/rekabetçi kullanım için ayrıca sunucu hakemi gerekir.

Kuralların tekrar eden koltuk kontrolleri `scripts/build-rules.js` ile üretilir. Güncellemek için `npm run rules:build`; `npm run check` dosyanın üreticiyle aynı kaldığını doğrular.

Odalar altı saat geçerlidir. Süresi dolan veriler otomatik üzerine yazılmaz; uzun vadeli temizlik yönetici göreviyle yapılabilir.

## Yayınlama ve önizleme

Dosyalar GitHub Pages veya herhangi bir statik sunucuda repo kökünden yayımlanabilir. JavaScript modülleri HTTP(S) ister; service worker yalnızca HTTPS'te kaydedilir.

GitHub Pages yayın kaynağı `main` dalı ve `/(root)` klasörüdür. Kök dizindeki `.nojekyll`, derleme gerektirmeyen HTML/CSS/JS dosyalarının Jekyll işleminden geçirilmeden yayımlanmasını sağlar.

Yayın kontrolünde “Oyun ve Firebase kuralları” testleri ile “pages build and deployment” dağıtımı ayrı ayrı başarılı olmalıdır. Testlerin geçmesi tek başına canlı sitenin güncellendiği anlamına gelmez. Dağıtım hatasında Actions kaydındaki `deploy` adımını kontrol et; son başarılı site sürümü sunulmaya devam edebilir. Firebase kurallarının yayımlanması ayrıca yapılır.

```sh
python3 -m http.server 8080
```

`http://localhost:8080/` gerçek Firebase'i kullanır. `?demo=1` örnek oyuncularla bellekte önizlemedir; canlı oda oluşturmaz. `scene=lobby`, `scene=game` veya `scene=results` ilgili ekranı sabit kartlar ve işaretlerle açar; bu sahnelerde botlar donuktur. `?mod=bot` kayıtlı adla doğrudan botlarla oyun açar.

## Doğrulama

Node.js 22 ve Java 21 önerilir.

```sh
npm install
npm run check
npm test
npm run test:database
```

Oyun testleri gerçek kart örneklerini, 2.000 kartı, 100 manuel turu, ilk tamamlayanı, puanları, çekiliş hızını, Türkçe sayı okunuşunu, yakın kazanma hesabını, ödül ve tepki akışlarını doğrular. Bot testleri sahte saatle tam turu, çekiliş aralığını, arka planda duraklatmayı ve tekrar oynamayı sınar. Firebase Emulator testleri eşzamanlı katılımı, iki canlı dinleyiciyi, işaretleme sırasını, sahte ilerleme/ödül/puan değişikliklerini, ilk çinko ve tombala yarışlarını, çekiliş hızı yetkisini, tepki kurallarını ve lobiye sıfırlamayı sınar. Emülatör testleri canlı veritabanına yazmaz.
