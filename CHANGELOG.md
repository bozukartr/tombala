# Sürüm kaydı

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
