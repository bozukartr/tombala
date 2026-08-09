# Tombala

Tarayıcıda çalışan, oda tabanlı çok oyunculu tombala. Kurulum yok: linki aç, 5 haneli kodu paylaş, 2–6 kişiyle oyna.

Vanilla HTML + CSS + JavaScript. Derleme adımı, paket yöneticisi ve framework yok. Gerçek zamanlı katman Firebase Realtime Database.

---

## Hızlı başlangıç

Firebase kurmadan denemek için:

```bash
npx serve .
```

Açılan adreste **Tek cihazda dene**'ye bas. İki bot rakiple tam oyun döngüsü çalışır — kart seçimi, çekiliş, işaretleme, çinko ve tombala dahil.

> `file://` üzerinden açma; ES modülleri CORS nedeniyle çalışmaz. Yerel bir sunucu gerekir.

## Çevrimiçi oyun için Firebase kurulumu

1. [console.firebase.google.com](https://console.firebase.google.com) → yeni proje.
2. **Build → Realtime Database → Create Database**. Bölge seç, "locked mode" ile başlat.
3. **Build → Authentication → Sign-in method → Anonymous**'u aç.
4. **Project settings → Your apps → Web** ile bir web uygulaması ekle, config değerlerini kopyala.
5. `config.example.js` dosyasını `config.js` olarak kopyala ve değerleri yapıştır.
6. Güvenlik kurallarını yükle:
   ```bash
   npx firebase-tools deploy --only database
   ```
   ya da konsolda **Realtime Database → Rules** sekmesine `database.rules.json` içeriğini yapıştır.
   Bu adım atlanırsa oda kurma dahil her yazma reddedilir; kurallar yüklenmeden çevrimiçi mod çalışmaz.

`config.js` `.gitignore` içinde. Anahtarları repoya gönderme — web API anahtarı gizli sayılmasa da odaları asıl koruyan şey güvenlik kurallarıdır.

## GitHub Pages'e yayınlama

```bash
git init && git add . && git commit -m "tombala"
git branch -M main
git remote add origin git@github.com:KULLANICI/tombala.git
git push -u origin main
```

Repo → **Settings → Pages → Source: Deploy from a branch → main / (root)**.

`config.js` gitignore'da olduğu için Pages'te çevrimiçi mod kapalı gelir. Seçenekler:

- `config.js`'i tek seferlik `git add -f config.js` ile ekle (küçük özel projeler için yeterli), **veya**
- bir GitHub Actions adımıyla repo secret'larından derleme sırasında üret.

Her iki durumda da Firebase konsolunda **Authentication → Settings → Authorized domains** listesine `KULLANICI.github.io` alan adını ekle.

---

## Oyun kuralları

Kart 3 satır × 9 sütundur; 27 hücrenin 15'i doludur ve her satırda tam 5 sayı bulunur. Sütun aralıkları soldan sağa 1–9, 10–19 … 70–79, 80–90'dır. Hiçbir sütun boş kalmaz, bir sütunda en çok 3 sayı olur.

| Aşama | Koşul |
|---|---|
| 1. Çinko | Bir satırın 5 sayısının tamamı işaretlenir |
| 2. Çinko | İkinci bir satır tamamlanır (önce 1. çinko ilan edilmiş olmalı) |
| Tombala | 15 sayının tamamı işaretlenir, oyun biter |

İlanı oyuncu yapar. Doğrulamayı host yürütür ve oyuncunun kartı ile çekilen sayıları karşılaştırır; **"kazandım" mesajına güvenilmez**. Yanlış ilan yapan oyuncunun ilan butonları 10 saniye kilitlenir. Aynı çekilişte gelen geçerli ilanlar paylaşımlı sayılır.

Elle işaretleme modunda bir satır ancak oyuncunun kendi işaretledikleriyle tamamlanır; çıkmış ama işaretlenmemiş sayı çinko sağlamaz.

## Dosya düzeni

| Dosya | İşi |
|---|---|
| `card.js` | Kart üretimi, elle kurulan kartın düzene oturtulması, kural doğrulaması |
| `game.js` | Kazanma değerlendirmesi, ilan doğrulama, paylaşımlı çinko çözümü |
| `net-firebase.js` | Realtime Database taşıma katmanı, presence, host devri |
| `net-local.js` | Aynı arayüzün botlu tek cihaz karşılığı |
| `fx.js` | Web Audio ile üretilen sesler, titreşim, konfeti, sarsıntı |
| `app.js` | Ekran yönlendirme, oyun akışı, host çekiliş döngüsü |
| `styles.css` | Palet, taş estetiği, mobil HUD yerleşimi |

`net-firebase.js` ve `net-local.js` aynı fonksiyonları dışa aktarır, bu yüzden `app.js` hangi modda çalıştığını bilmez.

## Veri şeması

```
rooms/{5 haneli kod}
  meta      { hostId, status, createdAt, settings:{ drawMode, drawInterval, autoMark } }
  players/{uid}  { name, avatar, color, ready, card, marked, connected, joinedAt }
  game      { drawn, lastNumber, drawnAt }
  claims/{uid}   { type, atDraw, at, valid, reason }
  winners   { cinko1:[], cinko2:[], tombala:[] }
```

Realtime Database `null` değerleri sildiği için 27 hücrelik ızgara `"0,5,0,23,…"` biçiminde metin olarak saklanır (`encodeGrid` / `decodeGrid`). Aynı sebeple `marked` de virgülle ayrılmış metindir.

Odalar 6 saat sonra bayat sayılır; aynı kod yeniden kullanılabilir hale gelir. Kalıcı temizlik istersen zamanlanmış bir Cloud Function ile `createdAt` üzerinden silebilirsin.

## Bilinen sınırlar

- Çekiliş zamanlaması host istemcisinde yürür. Host'un sekmesi arka plana alınırsa tarayıcı zamanlayıcıyı yavaşlatabilir; `drawnAt` damgası sayesinde diğer oyuncular senkron kalır ama çekiliş gecikebilir.
- Oda başına 6 oyuncu sınırı yalnızca istemcide uygulanır. Realtime Database kural dili bir düğümün çocuklarını sayamadığı için bu sınır kuralla zorlanamıyor.
- Host, oda düğümlerine yazma yetkisine sahiptir. Aynı odada tanımadığın kişiyle oynarken bunu hesaba kat.
- Bir oyuncu kendi `claims/{uid}/valid` alanına yazabilir; yazma izni üst düğümde verildiği için alt kuralla geri alınamıyor. Bunun tek etkisi kendi ilanını geçersiz kılmaktır, kazanmaya yaramaz — kazananları yalnızca host yazar.

## Test

`card.js`, `game.js` ve `net-local.js` saf mantıktır ve DOM bilmez. Mantık testleri
bağımlılıksız çalışır — kart üretimi, kural doğrulaması ve botlu tam oyun döngüsü dahil:

```bash
node tests/logic.test.mjs
```

Güvenlik kurallarının testi Firebase emulator'ü ister. Ayrı bir terminalde:

```bash
npx firebase-tools emulators:start --only database --project tombala
```

sonra:

```bash
npm i --no-save --no-package-lock @firebase/rules-unit-testing firebase
node tests/rules.spec.mjs
```

Emulator'ün kural motoru yayındakiyle aynıdır. `database.rules.json` burada derlenmiyorsa
`firebase deploy --only database` de reddeder — kuralları değiştirdikten sonra bu testi çalıştır.

> Kural dosyasında yorumlar `//` ile yazılır. `"//"` **adlı bir anahtar** kural motorunda
> yol parçası sayılır ve dosyanın tamamının reddedilmesine yol açar.

## Lisans

MIT.
