# Sürüm kaydı

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
