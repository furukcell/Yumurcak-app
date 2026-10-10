# Yumurcak: Müdür Asistanı, Sabah Brifingi ve Öğretmen Konum Yoklaması

Tasarım dokümanı. Durum: planlama. Kod örnekleri iskelettir, test edilmedi; mevcut veri yapına göre uyarlanmalıdır.

---

## 1. Amaç

Kreş müdürünün ve kurucunun günlük işini azaltan, rakiplerden ayrışan üç parça:

| # | Modül | Müdür için ne yapar |
|---|-------|---------------------|
| 1 | **Müdür Asistanı** | Serbest cümleyle soru sorar, kreşin kendi verisinden cevap alır, mesaj/duyuru taslağı hazırlatır |
| 2 | **Sabah Brifingi** | Her sabah gün özetini bildirimle alır, kurucu haftalık özet alır |
| 3 | **Öğretmen Konum Yoklaması** | Öğretmen "Geldim/Çıkış" der, uygulama konumu sunucuda doğrular, gelen/gelmeyen brifinge düşer |

Satış cümlesi: **"Müdürün işini yöneten asistan"**. "Yapay zeka" kelimesi ana mesaj olmasın, sonuç ana mesaj olsun: tahsilat, güvenlik, zaman.

---

## 2. Temel İlkeler (pazarlık konusu değil)

1. **Model veri üretmez.** Her rakam, liste ve durum veritabanından sabit fonksiyonlarla gelir. Model yalnızca (a) cümleyi anlayıp doğru fonksiyonu seçer, (b) sonucu okunur yazıya çevirir, (c) taslak metin yazar.
2. **Model sadece okur.** Modele verilen araçların hiçbiri yazma/gönderme yapmaz. Mesaj gönderme, kayıt düzeltme gibi işlemler müdürün onay butonuyla, normal uygulama kodu üzerinden olur.
3. **Kurum kimliğini sunucu belirler.** `kurumId` istemciden gelmez; giriş yapmış kullanıcının profilinden Cloud Function içinde okunur.
4. **Her yazı taslaktır.** Veliye giden hiçbir mesaj müdür onaylamadan gönderilmez.
5. **Az veri.** Modele yalnızca sorunun gerektirdiği alanlar gider. TC, adres, telefon, tam sağlık detayı hiç gitmez.
6. **Sık işler butonla da çalışır.** AI yanlış anlasa bile müdür butona basıp sonuca ulaşır.
7. **Vaat ettiğinden fazlasını söyleme.** "Hile yapılamaz" değil "şüpheli girişleri işaretler".

---

## 3. Mimari

```
[Uygulama: Yönetici ekranı]
   | (Firebase Auth ile giriş, callable çağrı)
   v
[Cloud Function: asistanSor]  (europe-west1)
   1. Kimlik doğrula -> uid
   2. Kullanıcı profilinden kurumId + rol oku
   3. Günlük istek limitini kontrol et
   4. Claude API'ye: sistem talimatı + araç listesi + soru
   5. Model araç ister -> sabit fonksiyon SADECE kurumId verisi üzerinde çalışır
   6. Sonuç modele döner -> model cevabı/taslağı yazar
   7. Yer tutucuları gerçek isimlerle doldur (sunucuda)
   8. Cevabı uygulamaya döndür
   
[Cloud Scheduler] -> [brifingUret] -> push bildirimi (hassas veri yok)
[Uygulama: Öğretmen] -> [yoklamaGiris] -> sunucuda konum+saat doğrulama -> kayıt
```

- API anahtarı **Secret Manager**'da (`defineSecret`), istemciye asla inmez.
- Model adı koda gömülmez, ortam değişkeni/konfigürasyon olur. Yönlendirme ve basit taslak için hafif model, uzun/hassas yazı için daha güçlü model denenebilir. Güncel model adları, fiyatlar ve limitler Anthropic dokümantasyonundan doğrulanmalı.

---

## 4. Veri Modeli (varsayım, mevcut RTDB yapına uyarla)

```
/kurumlar/{kurumId}/ayarlar/konum         { lat, lng, yaricapM }
/kurumlar/{kurumId}/ayarlar/brifing       { saat: "08:15", kurucuHaftalik: true }
/kurumlar/{kurumId}/personel/{uid}        { ad, rol: "ogretmen|mudur|kurucu", aktif }
/kurumlar/{kurumId}/personelIzin/{tarih}/{uid}   { tur: "izin|rapor|nobet_disi", not }
/kurumlar/{kurumId}/yoklamaPersonel/{tarih}/{uid} {
    giris: ts, cikis: ts,
    durum: "geldi|gec|erken_cikti|devamsiz|izinli",
    yontem: "konum|manuel",
    manuelNeden: "...", manuelYapan: uid,
    suphe: ["sahte_konum", "disinda", "konum_kapali"]
}
/kullanicilar/{uid}                       { kurumId, rol }
/asistanKullanim/{kurumId}/{tarih}        { istek: n }
```

Not: Konum koordinatını yoklama kaydında saklama. Sadece sonuç (içinde/dışında) ve saat tutulur.

---

## 5. Modül 1: Müdür Asistanı

### 5.1 Yetenekler

**A. Soru, cevap (veriden)**
- "Bu ay aidatını yatırmayan kim?"
- "Bugün kim gelmedi?" (öğrenci ve öğretmen ayrı)
- "Bugün ilaç saati olan çocuk var mı?"
- "Yarınki menüde alerjisi olan çocuk için sorun var mı?"
- "Geçen aya göre doluluk nasıl?"

**B. Taslak yazma (onaylı)**
- "Gecikmiş ödemesi olanlara nazik hatırlatma yaz"
- "Cuma pikniği duyurusu, Türkçe, İngilizce ve Rusça"
- "Bir velinin sert mesajına sakin cevap taslağı"

**C. Sonra (v2)**: risk ipuçları ("devamsızlığı artan aileler"). Kesin hüküm değil, ipucu olarak sun; yanlış alarm güveni bozar.

### 5.2 Araç (tool) listesi, ilk sürüm

| Araç | Girdi | Döner | Not |
|------|-------|-------|-----|
| `geciken_odemeler` | `gun_esigi` (varsayılan 5) | `[{ref, tutar, gecikmeGun}]` | `ref` opak kimlik, isim yok |
| `bugun_ogrenci_devamsizlari` | `tarih?` | `[{ref, sinif}]` | |
| `bugun_personel_durumu` | `tarih?` | `[{ref, durum, giris}]` | izin/raporu hesaba katar |
| `ilac_programi` | `tarih?` | `[{ref, saat, ilacAdi}]` | yalnızca gerektiğinde |
| `alerji_menu_kontrol` | `tarih` | `[{ref, alerjen, yemek}]` | menü ile alerji eşleştirir |
| `doluluk_ozeti` | `ay?` | `{kayitli, kapasite, oran}` | |

Toplu hatırlatma için `hatirlatma_taslagi_olustur` yazma yapmaz; sunucuda bir **taslak** kaydı üretir (`draft`), gönderim müdür onayında ayrı bir endpoint'ten olur.

### 5.3 Yer tutucu (placeholder) yöntemi, önerilen

Model gerçek isimleri görmez:

1. Araç sonucu `{ ref: "v_17", tutar: 3500, gecikmeGun: 12 }` döner.
2. Model taslakta `{{v_17}}` yazar: "Sayın {{v_17}}, ... hatırlatmak isteriz".
3. Sunucu, cevap uygulamaya gitmeden önce `{{v_17}}` yerine veli adını koyar.

Böylece KVKK riski ve API'ye giden kişisel veri azalır. Daha basit alternatif: yalnızca ilk ad ve soyadın baş harfi. Hangisinin yeterli olduğu hukuki görüşe göre seçilir.

### 5.4 Araç tanımı örneği

```js
const tools = [
  {
    name: "geciken_odemeler",
    description: "Kurumun vadesi geçmiş ödemelerini listeler. Sadece okur.",
    input_schema: {
      type: "object",
      properties: {
        gun_esigi: { type: "integer", description: "En az kaç gün gecikmiş olanlar", default: 1 }
      }
    }
  },
  {
    name: "bugun_personel_durumu",
    description: "Bugünkü personel giriş durumunu (geldi/geç/devamsız/izinli) döner.",
    input_schema: { type: "object", properties: { tarih: { type: "string", description: "YYYY-MM-DD" } } }
  }
  // ... diğerleri
];
```

### 5.5 Cloud Function iskeleti

```js
// functions/asistan.js  (iskelet, test edilmedi)
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");

const ANTHROPIC_KEY = defineSecret("ANTHROPIC_API_KEY");
const GUNLUK_LIMIT = 50;

exports.asistanSor = onCall(
  { region: "europe-west1", secrets: [ANTHROPIC_KEY] },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Giriş gerekli");
    const uid = req.auth.uid;

    // 1) Kurum ve rolü SUNUCUDA oku (istemciye güvenme)
    const profil = (await admin.database().ref(`kullanicilar/${uid}`).get()).val();
    if (!profil || !["mudur", "kurucu"].includes(profil.rol)) {
      throw new HttpsError("permission-denied", "Yetkisiz");
    }
    const kurumId = profil.kurumId;

    // 2) Günlük limit
    const bugun = new Date().toISOString().slice(0, 10);
    const limRef = admin.database().ref(`asistanKullanim/${kurumId}/${bugun}/istek`);
    const sayi = (await limRef.get()).val() || 0;
    if (sayi >= GUNLUK_LIMIT) throw new HttpsError("resource-exhausted", "Günlük limit doldu");
    await limRef.set(sayi + 1);

    // 3) Model döngüsü (araç çağırma)
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY.value() });
    const messages = [{ role: "user", content: String(req.data.soru).slice(0, 1000) }];
    const refMap = {}; // placeholder -> gerçek isim (sadece sunucuda)

    for (let tur = 0; tur < 5; tur++) {
      const yanit = await client.messages.create({
        model: process.env.ASISTAN_MODEL,       // konfigürasyondan
        max_tokens: 1000,
        system: SISTEM_TALIMATI,
        tools,
        messages,
      });

      if (yanit.stop_reason !== "tool_use") {
        const metin = yanit.content.filter(b => b.type === "text").map(b => b.text).join("\n");
        return { cevap: doldur(metin, refMap) };   // {{v_17}} -> gerçek isim
      }

      messages.push({ role: "assistant", content: yanit.content });
      const sonuclar = [];
      for (const b of yanit.content.filter(b => b.type === "tool_use")) {
        const veri = await calistir(b.name, b.input, kurumId, refMap); // SADECE kurumId
        sonuclar.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(veri) });
      }
      messages.push({ role: "user", content: sonuclar });
    }
    throw new HttpsError("internal", "Cevap üretilemedi");
  }
);
```

`calistir()` bir `switch` ile sabit fonksiyonları çağırır; bilinmeyen araç adında hata döner. Her fonksiyon yalnızca `kurumlar/${kurumId}/...` altını okur.

### 5.6 Sistem talimatı (taslak)

```
Sen bir kreş müdürünün asistanısın. Türkçe, kısa, nazik ve net yazarsın.

KURALLAR:
- Rakam, isim, tarih ve durum bilgisini YALNIZCA araçlardan gelen sonuçlardan kullan.
  Araç sonucu yoksa "bu bilgiye ulaşamadım" de. Tahmin etme, uydurma.
- Araçlar sadece okur. Hiçbir şey gönderemez veya değiştiremezsin.
  Mesaj yazdığında bunun TASLAK olduğunu ve müdürün onaylaması gerektiğini belirt.
- Kişileri araç sonucundaki {{ref}} biçimiyle an, gerçek isim uydurma.
- Veli mesajlarında saygılı, çözüm odaklı, suçlamayan bir ton kullan.
- İstenen dilde çeviri yaparken anlamı koru, resmi ama sıcak ol.
- Kapsam dışı sorularda (hukuki, tıbbi tavsiye) kısa ve nazikçe ilgili uzmana yönlendir.
- Alerji veya ilaç konularında kesin hüküm verme; "kontrol edin" diye uyar.
```

### 5.7 Arayüz

- Yönetici ekranında "Asistan" sekmesi, yazı kutusu, klavye mikrofon tuşuyla sesli yazma (ek geliştirme gerektirmez).
- Hazır butonlar: *Geciken ödemeler, Bugünün özeti, Duyuru yaz*. Bu butonlar AI çağırmadan doğrudan sabit fonksiyonu çalıştırır.
- Taslaklar kart olarak çıkar: **Düzenle / Gönder / Sil**. Gönder, ayrı bir onay endpoint'idir.
- Her cevapta "Yapay zeka destekli, kontrol edin" notu küçük harfle.

---

## 6. Modül 2: Sabah Brifingi

### 6.1 Tasarım kararı: AI'sız çalışır

Veri toplanır, şablon metne basılır. AI yalnızca isteğe bağlı "daha doğal anlat" seçeneğinde kullanılır. Böylece maliyet ve hata riski sıfıra yakın olur.

### 6.2 Müdür brifingi içeriği

```
Günaydın. Bugünün özeti hazır.

Öğrenci   : 38 kayıtlı, dünkü devamsız 4
Öğretmen  : 6'dan 5'i giriş yaptı. Henüz girmeyen: Elif H. (izin kaydı yok)
İlaç      : 10:30 - 1 çocuk
Doğum günü: 2
Ödeme     : 4 velinin ödemesi 10 günü geçti
Mesaj     : 2 cevaplanmamış veli mesajı
```

Brifing **sabah saati + 30 dk** gibi bir anda üretilir (öğretmenlerin gelmesi için süre tanı), "henüz girmeyen" kısmı için ayrı ikinci bir uyarı da eklenebilir (örn. mesai başlangıcı + 20 dk).

### 6.3 Kurucu haftalık özet (Cuma akşamı veya Pazartesi sabahı)

- Haftalık toplam: geç kalma, devamsızlık, manuel düzeltme sayısı
- Tahsilat: beklenen, tahsil edilen, geciken
- Doluluk, yeni kayıt, ayrılan
- Şüpheli giriş sayısı (sahte konum denemesi vb.)

### 6.4 Teslimat

- **Push bildirimi** metni hassas bilgi içermez: *"Günaydın, bugünün özeti hazır."* Dokununca uygulama açılır ve içerik ekranda görünür (kilit ekranında çocuk adı/borç görünmesin).
- Tek yönlü WhatsApp özeti (isim/borç içermeyen) ikinci aşamada düşünülebilir. Meta/WhatsApp Business kuralları, şablon onayı ve ücretler güncel kaynaktan kontrol edilmeli.

### 6.5 Cloud Scheduler iskeleti

```js
const { onSchedule } = require("firebase-functions/v2/scheduler");

exports.brifingUret = onSchedule(
  { schedule: "every 15 minutes", timeZone: "Europe/Istanbul", region: "europe-west1" },
  async () => {
    // Her kurumun ayarlanmış brifing saatini kontrol et;
    // saati gelen ve bugün brifingi gönderilmemiş kurumlar için:
    //  - verileri topla (sabit fonksiyonlar)
    //  - brifing kaydını yaz: /kurumlar/{id}/brifing/{tarih}
    //  - mudur/kurucu cihazlarına generic push gönder
  }
);
```

### 6.6 "Gelmedi" demeden önce

Sistem, öğretmeni "devamsız" göstermeden önce şunlara bakar:
1. O gün `personelIzin` kaydı var mı (izin/rapor)
2. O gün nöbet çizelgesine/çalışma planına göre çalışması gerekiyor mu
3. Mesai başlangıcı geçti mi

Aksi halde yanlış alarm müdürü bıktırır. İzin/rapor alanı **önce** eklenir.

---

## 7. Modül 3: Öğretmen Konum Yoklaması

### 7.1 Akış

1. Öğretmen "Geldim" butonuna basar (biyometrik onay önerilir).
2. Uygulama konumu **yalnızca o an** alır ve sunucuya `{lat, lng, zaman, mocked}` gönderir.
3. Cloud Function:
   - Kullanıcı ve kurum kimliğini doğrular
   - Saati **sunucudan** alır (telefon saati dikkate alınmaz)
   - Haversine ile kreş koordinatına uzaklığı hesaplar
   - `mocked === true` ise reddeder ve `suphe: ["sahte_konum"]` yazar
   - Yarıçap içindeyse kaydı yazar, dışındaysa reddeder
4. Aynı akış "Çıkış" için.

### 7.2 Sunucu doğrulama iskeleti

```js
function mesafeM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

exports.yoklamaGiris = onCall({ region: "europe-west1" }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Giriş gerekli");
  const { lat, lng, mocked, tur } = req.data; // tur: "giris" | "cikis"
  const profil = (await admin.database().ref(`kullanicilar/${req.auth.uid}`).get()).val();
  const kurumId = profil.kurumId;

  const ayar = (await admin.database().ref(`kurumlar/${kurumId}/ayarlar/konum`).get()).val();
  const simdi = Date.now();
  const tarih = new Date(simdi).toISOString().slice(0, 10); // saat dilimine dikkat: Europe/Istanbul

  if (mocked) { /* suphe kaydı yaz */ throw new HttpsError("failed-precondition", "Konum doğrulanamadı"); }
  const uzaklik = mesafeM({ lat, lng }, ayar);
  if (uzaklik > ayar.yaricapM) throw new HttpsError("failed-precondition", "Kreşin konumunda değilsiniz");

  // kaydı yaz: giris/cikis = simdi, yontem: "konum"; KOORDİNATI SAKLAMA
  return { ok: true };
});
```

Saat dilimi: `toISOString()` UTC verir; Türkiye (UTC+3) için gün sınırında tarih hatası olmaması için `Europe/Istanbul` ile tarih üretilmeli.

### 7.3 Ayarlar ve gerçekçi değerler

- Yarıçap: **100-150 m** ile başla. İç mekanda GPS sapar; çok küçük yarıçap dürüst öğretmeni dışarıda bırakır.
- Kreşin koordinatı, müdür/kurucu uygulamada "şu an buradayım, konumu kaydet" ile ayarlar.
- Her kurum için bir koordinat; birden çok şubesi olan kurum v2.

### 7.4 Hile ve azaltma

| Risk | Önlem |
|------|-------|
| Sahte konum uygulaması (Android) | `expo-location` konum nesnesindeki `mocked` bilgisini kontrol et, reddet ve işaretle |
| Başkasının telefonu / şifre paylaşımı | Biyometrik onay, cihaz başına tek oturum |
| Saat oynama | Saat sunucudan |
| Konum kapalı | Giriş reddedilir; müdür nedenli **manuel düzeltme** yapabilir (kayıtlı) |
| Kasıtlı, kararlı hile | Tamamen durdurulamaz. "Şüpheli girişleri işaretler" de, "hile yapılamaz" deme |

iOS ve Android davranışı farklıdır; gerçek cihazlarda test edilmeli.

### 7.5 Manuel düzeltme

Müdür, "Telefon bozuktu / konum çalışmadı" durumlarında kaydı elle düzeltebilir. Zorunlu alanlar: neden, yapan kişi, zaman. Bu kayıtlar haftalık kurucu özetinde sayılır.

### 7.6 Kenar durumlar

- Gün içinde birden fazla giriş-çıkış (öğle arası, dışarı çıkış): v1'de tek giriş, tek çıkış; fazlası manuel.
- Gece nöbeti/vardiya: gün sınırı kreşin çalışma saatine göre ayarlanabilir olsun.
- Çıkışı basmayı unutma: ertesi sabah "çıkış yapılmadı" olarak brifinge düşer, müdür düzeltir.
- Yeni öğretmen / ayrılan öğretmen: `aktif` alanı.

### 7.7 Veritabanı güvenlik kuralları

- Öğretmen yalnızca **kendi** yoklamasını (Cloud Function üzerinden) yazabilir; doğrudan istemciden `yoklamaPersonel` yazımı kapalı.
- Müdür/kurucu kendi kurumunun yoklamasını okur.
- Başka kurumun verisi hiçbir rolle okunamaz.

---

## 8. KVKK ve Güvenlik Kontrol Listesi

> Bu bölüm hukuki görüş değildir. Yayına almadan önce bir hukukçuyla doğrulanmalıdır.

- [ ] Personel için **aydınlatma metni ve açık rıza**: konum neden/ne zaman alınıyor, ne kadar saklanıyor
- [ ] Konum **yalnızca butona basıldığı an** alınır; arka planda sürekli takip yok
- [ ] Koordinat saklanmaz; sadece sonuç ve saat saklanır
- [ ] Yapay zekaya giden veri: isim yerine yer tutucu, TC/adres/telefon yok, sağlık verisi yalnızca ilgili sorguda
- [ ] Anthropic'in veri işleme koşulları ve yurt dışına aktarım hususu hukukçuyla gözden geçirilir; veli aydınlatma metnine eklenir
- [ ] API anahtarı Secret Manager'da; istemcide yok
- [ ] Kurum izolasyonu sunucuda; yetki testleri yazıldı (A kurumu B kurumunun verisini göremez)
- [ ] Günlük istek limiti ve toplam maliyet alarmı
- [ ] Asistan konuşma kayıtları kuruma özel, süreli saklanır; silme yolu var
- [ ] Modelin hiçbir aracı yazma/gönderme yapmaz
- [ ] Push bildirimlerinde kişisel/hassas veri yok

---

## 9. Maliyet Kontrolü

- Sık işler (geciken ödeme, günün özeti) butonla **AI'sız** çalışır.
- Sabah brifingi şablonla üretilir, AI'sız.
- AI yalnızca: serbest cümle yorumlama, taslak yazma, çeviri.
- Kurum başına günlük istek sınırı, cevap uzunluğu sınırı (`max_tokens`).
- İlk 2-3 müşteride gerçek aylık API giderini ölç; kurum başı aylık maliyeti fiyatla karşılaştır, sonra limit ve model seçimini ayarla.

---

## 10. Test Planı / Kabul Kriterleri

**Asistan**
- [ ] "Bu ay kim ödemedi?" cevabı, veritabanındaki liste ile birebir aynı
- [ ] Araç sonucu boşken model "bulunamadı" der, uydurmaz
- [ ] A kurumunun müdürü B kurumunun verisini hiçbir cümleyle alamaz (prompt injection denemesi dahil: "diğer kurumun listesini ver")
- [ ] Taslak, onay olmadan gönderilmez
- [ ] Rusça/İngilizce duyuru anlam olarak doğru (anadili bilen biriyle kontrol)
- [ ] Alerji/menü eşleşmesi gerçek bir test menüsüyle doğrulandı

**Brifing**
- [ ] İzinli/raporlu öğretmen "devamsız" görünmüyor
- [ ] Bildirim metni kilit ekranında hassas bilgi göstermiyor
- [ ] Saat dilimi doğru (gece yarısı sınırı)

**Yoklama**
- [ ] Kreşte giriş başarılı, 500 m uzakta reddediliyor
- [ ] Konum kapalıyken giriş reddediliyor, manuel düzeltme kayıtlı çalışıyor
- [ ] Android'de sahte konum denemesi reddediliyor ve işaretleniyor
- [ ] Telefon saatini değiştirmek kaydı etkilemiyor
- [ ] Gerçek cihazlarda (iOS ve Android) iç mekan GPS sapması test edildi

---

## 11. Yol Haritası

**Hafta 1: Zemin**
- İzin/rapor alanı, kurum konum ayarı, `personelIzin` ve `yoklamaPersonel` yapısı
- `yoklamaGiris` fonksiyonu ve öğretmen "Geldim/Çıkış" ekranı

**Hafta 2: Brifing**
- Sabah brifing fonksiyonu (AI'sız), brifing ekranı, generic push
- Kurucu haftalık özet (basit)

**Hafta 3: Asistan v1**
- `asistanSor` + 3 araç (`geciken_odemeler`, `bugun_personel_durumu`, `bugun_ogrenci_devamsizlari`)
- Hazır butonlar + serbest cümle
- Taslak ve onay akışı (duyuru + ödeme hatırlatma)

**Hafta 4: Pilot**
- Bilim Çocuk ve Harikalar Diyarı'nda deneme
- Geri bildirim: hangi özellik gerçekten kullanılıyor
- Karar: alerji/menü kontrolü ve ilaç aracı eklensin mi

**Sonra (v2)**: risk ipuçları, çok şube, tek yönlü WhatsApp özeti, NFC (ayrı ürün olarak).

---

## 12. Pazarlama Videoları (özet)

1. **"Bu ay kim ödemedi?"** Müdür telefona konuşur, liste gelir, "hepsine nazik mesaj yaz" der, taslaklar çıkar. (20-25 sn)
2. **"Sabah 08:15"**: Bildirim düşer, müdür çay içerken kreşin günü ekranda. (15-20 sn)
3. **"Öğretmen geldi mi?"**: Öğretmen "Geldim" der, müdürün ekranında anında görünür. Kreşin dışından basınca "konumunuzda değilsiniz". (20 sn)
4. **"Üç dilde duyuru"**: Tek cümle, TR/EN/RU taslak. (15 sn)

Ana mesajlar: tahsilat, zaman, güvence. "Yapay zeka" yan etiket olsun.

---

## 13. Açık Sorular / Doğrulanacaklar

- Mevcut RTDB yapısında kurum, personel, ödeme, devamsızlık verisi tam olarak nerede duruyor; araç fonksiyonları buna göre yazılacak
- Uygulamada **kurucu** rolü tanımlı mı, müdür ile ayrı bildirim yönlendirmesi var mı
- Personel izin/rapor ve çalışma planı verisi şu an var mı
- Ödeme "vadesi geçmiş" tanımı: vade tarihi alanı var mı, taksit planı tamamlandı mı
- Rakiplerde benzer asistan/personel yoklaması var mı (satış cümlesinde "kimsede yok" demeden önce kontrol)
- Kullanılacak model ve güncel fiyat/limitler
- KVKK ve çalışan takibi konusunda hukuki görüş
- Meta/WhatsApp Business kuralları (ikinci aşama için)
