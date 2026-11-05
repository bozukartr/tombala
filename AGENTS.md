# Katkı iş akışı

- Her güncellemeyi `main` dalından açılan ayrı bir dalda yap.
- Değişiklikleri doğrudan `main` dalına kaydetme veya gönderme.
- Tamamlanan güncelleme için GitHub üzerinde bir pull request aç.
- Değişikliğe uygun kontrolleri çalıştır; başarısız kontrolleri düzelt.
- Kullanıcının talebi doğrultusunda kontroller geçtikten sonra PR'ı merge et ve bağlantısını paylaş.
- PR açıklamasında kapsamı, doğrulamayı ve canlıya alınmamış işleri açıkça belirt.

## Doğrulama

- JavaScript değişikliklerinde `npm run check` ve `npm test` çalıştır.
- Firebase oda işlemleri veya veritabanı kuralları değiştiğinde ayrıca `npm run test:database` çalıştır.
- Yalnızca belge değişikliklerinde `git diff --check` yeterlidir; GitHub'ın başlattığı kontrolleri de izle.
