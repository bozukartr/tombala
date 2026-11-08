# Sürüm kaydı

## 4.0.0 — 2026-11-08

- Arayüz baştan tasarlandı: sade tasarım belirteçleri, Manrope yazı tipi, büyük dokunma alanları, sistemle uyumlu açık/koyu tema ve elle tema seçimi. Önceki sürümdeki 5–9 px'lik metinler okunur boyutlara büyütüldü; yalnızca kart kimliği ve sütun aralığı etiketleri küçük kalır.
- Oyun ekranı: büyük çekiliş topu, sayının Türkçe okunuşu, son çıkanlar, otomatik çekilişte geri sayım halkası; ödül kartları; rakipler canlı mini kart haritası olarak; oyuncunun kendi kartı büyük ve öne çıkan. İşaret damgası anında görünür, sonuç oda transaction'ından gelir.
- Yeni **Botlarla** modu: 1–3 bot, Rahat/Orta/Çevik tepki hızı, Firebase'siz ve çevrimdışı çalışır; uygulama arka plana geçince duraklar.
- Yeni mekanikler: oda sahibinin seçtiği çekiliş hızı (Elle, 8, 5, 3 sn), turlar boyunca biriken puan (1. çinko +1, 2. çinko +2, tombala +3), “1 kaldı” yakın kazanma rozeti, 3-2-1 başlangıç geri sayımı, emoji tepkileri.
- Oyun hissi: sentezlenmiş ses efektleri, isteğe bağlı Türkçe sesli sayı okuma, titreşim (iOS'ta dokunsal anahtar yedeği), oyun sırasında ekranı açık tutma, tombalada konfeti.
- Ayarlar, yardım, katılma, sayı tablosu, kart seçimi, özel kart ve oyuncu kartı alttan açılan, sürüklenerek kapanan sayfalara taşındı. Davet bağlantısı katılma sayfasını kodla açar; dört hane girilince otomatik katılır.
- PWA: yeni vektör ikon ve PNG ikonlar (maskable dahil), “Botlarla oyna” kısayolu, ağ öncelikli service worker ile çevrimdışı açılış.
- Firebase: yeni `tombalaV5` veri modeli (`meta/pace`, oyuncu `score`, `game/interval` 3/5/8 sn) ve ayrı `tombalaV5Reactions` yolu. Puan yalnızca ödülü kazanan işaretlemeyle aynı transaction'da artar; oda sahibi dahil kimse puanı değiştiremez. Kurallar yeniden yayımlanmalı, odalar yeniden kurulmalıdır.
- `kurulum.html` yeni tasarıma taşındı.
- Doğrulama: 20 oyun/olay/bot testi ve 15 Firebase Emulator testi. Tarayıcıda 320×568, 375×667, 390×844 ve 430×932 ekranlarda açık ve koyu tema; botlarla tam tur ve tekrar oynama; emülatöre bağlı iki tarayıcıyla oda kurma, bağlantıyla katılma, hız ayarı, otomatik çekiliş, tepki, çinko/tombala, puan tablosu, ikinci tur ve ayrılma; service worker ile çevrimdışı açılış.

## 3.0.0 — 2026-11-06

- Beş gerçek kart referansına göre 3×9 yerleşim; orta solda ayrı kart kimliği, satırda 5 ve toplam 15 oyun sayısı. Sütun içi sıralama zorunluluğu kaldırıldı.
- Tüm oyuncuların kartları ve manuel işaretlemeleri ortak masada canlı gösterilir; yalnızca kart sahibi işaretleyebilir.
- Otomatik işaretleme kaldırıldı. İşaretleme, sıra ve ilk çinko/tombala kararı aynı Firebase transaction'ında doğrulanır.
- Ortak kazanan yerine ilk tamamlayıcı işlemi kaydedilen oyuncu kazanır. Tüm ekranlarda animasyonlu ödül bildirimi ve kart/satır vurgusu eklendi.
- Yeni veri modeli `tombalaV4` kullanır; güncel Firebase kuralları yayımlanmalı ve odalar yeniden kurulmalıdır.
- Doğrulama: 9 oyun/olay testi ve 12 Firebase Emulator testi; 320×667, 390×844 ve 430×932 mobil kontrolleri, manuel çinko/tombala ve tekrar lobiye dönüş.

## 2.1.1 — 2026-11-05

- Telefonda kuralları kopyalama, Firebase paneline geçiş ve salt okuma bağlantı kontrolü için `kurulum.html` eklendi.
- Oda erişimi reddedildiğinde ana ekrandaki hata artık kurulum rehberine yönlendirir.
- Canlı arayüzün yayımlandığı doğrulandı; Firebase kurallarını yayımlamak için hâlâ proje yöneticisi oturumu gerekiyor.

## 2.1.0 — 2026-11-05

- Kartlar 3×10 dönüşümlü yerleşime geçti: sütunlarda sırasıyla 2 ve 1 sayı, her satırda 5 sayı, toplam 15 sayı. Kullanıcının örneğindeki ilk iki satır üçüncü satıra genişletildi.
- Özel kart düzenleyicisinde boş kareler sabit; sütun aralıkları ve 90 sütunu korunuyor.
- Web sayfası düzeni yerine tam ekran mobil oyun kabuğu, sabit aksiyon alanı, yatay oyuncular, çekiliş sahnesi ve alttan açılan çekmeceler eklendi.
- PNG ana ekran ikonları ve davet bağlantısıyla oda kodunu paylaşma eklendi.
- Doğrulama: 6 oyun testi ve 7 Firebase Emulator testi; 320×667, 390×844 ve 430×932 ekran kontrolleri, özel kart kaydetme ve tekrar lobiye dönüş.
- Kart şeması değiştiği için yeni odalar `tombalaV3` yolunu kullanır. Güncel `database.rules.json` Firebase'e yayımlanmalıdır; eski odalar yeniden kurulmalıdır.

## 2.0.0 — 2026-11-05

Tombala HTML, CSS ve JavaScript ile sıfırdan yenilendi.

- Minimal ve mobil ekranlara uyumlu aile oyunu arayüzü.
- Firebase anonim giriş, dört haneli oda kodu ve 2–4 oyuncu.
- Lobide hazır kart seçimi ve özel kart oluşturma.
- Otomatik işaretleme, çinko/tombala hesaplama ve ortak kazananlar.
- Tekrar oynama öncesinde aynı odanın lobisine dönüş.
- Oda sahibi devri, bağlantı durumu ve oturuma yeniden katılma.

Doğrulama: 5 oyun testi ve 6 Firebase Emulator testi geçti. Tarayıcıda kart seçimi, özel kart doğrulaması, tam tur ve yeniden lobiye dönüş kontrol edildi.

Oyun kodu `d85fcad562fe479e4807e7b4a20cc85dc1909af6` commit'iyle daha önce doğrudan `main` dalına kaydedildi. Bu sürüm kaydı ve `AGENTS.md`, sonraki güncellemelerin ayrı dal, PR, kontrol ve merge akışını izlemesini belgeler; geçmişteki commit'i bir PR merge'i olarak göstermez.

Canlı kurulum: `database.rules.json` dosyasının `tombala-3d421` Firebase projesine yönetici oturumuyla yayımlanması gerekiyor. Bu yapılana kadar yeni çevrimiçi odalar erişim hatası verir.
