# Yumurcak Kreş

**Yumurcak Kreş**, kreş yönetimi, öğretmen ve veli arasındaki günlük iletişimi dijitalleştirmek için geliştirilen React Native / Expo tabanlı mobil takip uygulamasıdır.

Uygulama ile:

* Yönetici; sınıf, çocuk, öğretmen, veli, duyuru, ödeme, ders programı ve etkinlik yönetimi yapabilir.
* Öğretmen kendi sınıfındaki çocuklar için günlük rapor girebilir.
* Veli sadece kendisine bağlı çocuğun bilgilerini, raporlarını ve ilgili içerikleri görebilir.

Proje şu anda **Android APK / MVP geliştirme ve test aşamasındadır**.

---

## Güncel Durum

* Android APK açılıyor.
* Firebase Realtime Database bağlantısı çalışıyor.
* Kullanıcı adı / şifre ile giriş çalışıyor.
* Rol bazlı yönlendirme çalışıyor.
* Yönetici, öğretmen ve veli panelleri ayrılmış durumda.
* Yönetici dashboard modern mor/beyaz tasarıma geçirildi.
* Veli paneli modern mobil arayüze geçirildi.
* Yönetici panelinde sınıf, çocuk, öğretmen, veli ve duyuru yönetimi çalışıyor.
* Öğretmen listesine `+` ekleme butonu eklendi.
* Öğretmen listesi gerçek ad, kullanıcı adı ve sınıf bilgisiyle gösteriliyor.
* Veli listesi çocuk adı, sınıf ve telefon bilgisiyle zenginleştirildi.
* Çocuk listesi veli adı, telefon, sınıf ve öğretmen bilgisiyle zenginleştirildi.
* Çocuk detay ekranı iskeleti eklendi.
* Ödeme takibi ekranları eklendi.
* Haftalık ders programı ekranları eklendi.
* Etkinlik takvimi ekranları eklendi.
* Veli tarafında haftalık / aylık yemek listesi görüntüleme eklendi.
* Codemagic üzerinden release APK alınabiliyor.

---

## Proje Amacı

Kreşlerde velilerin en çok merak ettiği konular:

* Çocuğum bugün nasıldı?
* Yemek yedi mi?
* Uyudu mu?
* Öğretmen notu var mı?
* Kreşten duyuru veya etkinlik bilgisi var mı?

Yumurcak Kreş, bu bilgileri WhatsApp grupları yerine daha düzenli, güvenli ve takip edilebilir bir sisteme taşımayı hedefler.

---

## Kullanıcı Rolleri

| Rol        | Açıklama                                                                                |
| ---------- | --------------------------------------------------------------------------------------- |
| `yonetici` | Kreş yönetimi. Sınıf, çocuk, öğretmen, veli, duyuru ve diğer yönetim işlemlerini yapar. |
| `ogretmen` | Kendi sınıfındaki çocuklar için günlük rapor girer.                                     |
| `veli`     | Sadece kendisine bağlı çocuğun bilgilerini görüntüler.                                  |

---

## MVP Akışı

1. Yönetici giriş yapar.
2. Sınıf oluşturur.
3. Öğretmen ekler ve sınıfa bağlar.
4. Veli ekler.
5. Çocuk ekler.
6. Çocuğu sınıfa ve veliye bağlar.
7. Öğretmen giriş yapar.
8. Kendi sınıfındaki çocukları görür.
9. Günlük rapor girer.
10. Veli giriş yapar.
11. Kendisine bağlı çocuğun raporunu görüntüler.

---

## Temel Özellikler

### Yönetici Paneli

* Sınıf yönetimi
* Çocuk yönetimi
* Öğretmen yönetimi
* Veli yönetimi
* Duyuru yönetimi
* Çocuk detay ekranı
* Ödeme takibi
* Haftalık ders programı
* Etkinlik takvimi
* Genel dashboard istatistikleri

### Öğretmen Paneli

* Kendi sınıfındaki çocukları görüntüleme
* Günlük rapor oluşturma
* Çocuk bazlı günlük durum girişi

### Veli Paneli

* Kendi çocuğunu görüntüleme
* Günlük raporları görüntüleme
* Duyuruları görüntüleme
* Haftalık / aylık yemek listesini görüntüleme
* Profil ekranı

---

## Teknolojiler

* Expo SDK 54
* React Native
* JavaScript
* Firebase Realtime Database
* AsyncStorage
* React Navigation
* Codemagic Android APK build

---

## Firebase Veri Modeli

Temel node yapısı:

```txt
kullanicilar/
kresler/
siniflar/
cocuklar/
gunlukRaporlar/
duyurular/
yemekListeleri/
odemeler/
dersProgramlari/
etkinlikler/
```

### Kullanıcılar

```txt
kullanicilar/{uid}
  kullaniciAdi
  sifre
  ad
  soyad
  rol: yonetici / ogretmen / veli
  aktif
  kresId
  sinifId
  telefon
  createdAt
```

### Çocuklar

```txt
cocuklar/{cocukId}
  ad
  soyad
  dogumTarihi
  kresId
  sinifId
  veliIds
  createdAt
```

Veli çocuğu görebilsin diye çocuk kaydında şu bağlantı olmalıdır:

```txt
veliIds: ["veli001"]
```

### Günlük Raporlar

```txt
gunlukRaporlar/{raporId}
  kresId
  cocukId
  sinifId
  ogretmenId
  tarih
  ruhHali
  yemek
  uyku
  tuvalet
  not
  createdAt
```

### Yemek Listeleri

```txt
yemekListeleri/{listeId}
  kresId
  tip: haftalik / aylik
  baslik
  baslangicTarihi
  bitisTarihi
  aktif
  ogunler / haftalar
  createdAt
```

### Ödemeler

```txt
odemeler/{odemeId}
  kresId
  cocukId
  veliId
  ay
  yil
  tutar
  durum: odendi / bekliyor / gecikti
  odemeTarihi
  createdAt
```

### Ders Programları

```txt
dersProgramlari/{sinifId}
  kresId
  sinifId
  gunler
  createdAt
```

### Etkinlikler

```txt
etkinlikler/{etkinlikId}
  kresId
  baslik
  tarih
  saat
  sinifIds
  aciklama
  aktif
  createdAt
```

---

## Test Kullanıcıları

### Yönetici

```txt
kullaniciAdi: admin
sifre: abc123
rol: yonetici
kresId: kres001
```

### Öğretmen

```txt
kullaniciAdi: ogretmen
sifre: abc123
rol: ogretmen
kresId: kres001
sinifId: sinif001
```

### Veli

```txt
kullaniciAdi: veli
sifre: abc123
rol: veli
kresId: kres001
```

---

## Kurulum

```bash
git clone https://github.com/furukcell/Yumurcak-app.git
cd Yumurcak-app
npm install --legacy-peer-deps
npx expo start --clear
```

---

## Android Build

Codemagic build akışı:

```bash
npm install --legacy-peer-deps
npx expo prebuild --clean --platform android
cd android
chmod +x gradlew
./gradlew assembleRelease
```

APK çıktısı:

```txt
android/app/build/outputs/apk/release/*.apk
```

Not:

* Codemagic’te **Build branch: main** seçilmelidir.
* Eski commit seçilirse eski hatalar tekrar görülebilir.

---

## Çözülen Büyük Teknik Sorunlar

* Firebase config / API key hataları giderildi.
* Android release APK JS bundle sorunu giderildi.
* `main has not been registered` hatası çözüldü.
* `index.js` ve `registerRootComponent` akışı düzeltildi.
* `package.json` içindeki `main` alanı `index.js` yapıldı.
* Firebase login şifre karşılaştırması düzeltildi.
* Kullanıcı adı / şifre input normalize edildi.
* Codemagic release APK üretimi çalışır hale getirildi.
* Öğretmen listesi `kullanicilar` node’undan okunacak şekilde düzeltildi.
* Veli ve çocuk listeleri ilişki bilgileriyle zenginleştirildi.

---

## Yol Haritası

### Faz 1 — Stabil MVP

* [x] Android APK açılışını düzelt
* [x] Firebase bağlantısını çalıştır
* [x] Login akışını çalıştır
* [x] Yönetici panelini açılır hale getir
* [x] Yönetici dashboard modern tasarıma geçir
* [x] Veli panelini modern tasarıma geçir
* [x] Öğretmen listesine ekleme butonu ekle
* [x] Öğretmen listesini ad / sınıf bilgisiyle göster
* [x] Veli listesini çocuk / sınıf / telefon bilgisiyle göster
* [x] Çocuk listesini veli / telefon / öğretmen bilgisiyle göster
* [x] Çocuk detay ekranı iskeleti
* [x] Ödeme takibi ekran iskeleti
* [x] Ders programı ekran iskeleti
* [x] Etkinlik takvimi ekran iskeleti
* [x] Veli tarafında yemek listesi görüntüleme
* [ ] Öğretmen günlük rapor girişini gerçek cihazda test et
* [ ] Veli günlük rapor görüntülemeyi gerçek cihazda test et
* [ ] Tüm CRUD akışlarını tek tek test et
* [ ] Eksik geri / çıkış butonlarını tamamla
* [ ] Boş veri ekranlarını kullanıcı dostu hale getir
* [ ] Tüm butonlara loading / disabled state ekle

### Faz 2 — Yönetici Paneli Geliştirmeleri

* [ ] PaymentFormScreen ödeme kaydında `kresId` ve `veliId` alanlarını garanti et
* [ ] PaymentListScreen ödeme kayıtlarını çocuk / veli / sınıf bilgisiyle daha okunur göster
* [ ] Yönetici dashboard’da aylık ödeme özeti göster
* [ ] Çocuk detay ekranında ödeme geçmişi göster
* [ ] Çocuk detay ekranında son günlük raporları göster
* [ ] Yönetici yemek listesi giriş ekranı ekle
* [ ] Haftalık / aylık yemek listesi oluşturma ekle
* [ ] Ders programı düzenleme ekranını tamamla
* [ ] Etkinlik oluşturma / düzenleme ekranını tamamla
* [ ] Bugün rapor girilen / girilmeyen çocuk sayısını dashboard’da göster
* [ ] Öğretmen bazlı günlük rapor tamamlama durumunu göster
* [ ] Yoklama özeti ekle

### Faz 3 — Veli Paneli Geliştirmeleri

* [ ] Veli tarafında etkinlik görüntüleme ekranı ekle
* [ ] Veli sadece kendi çocuğunun sınıfına ait etkinlikleri görebilsin
* [ ] Veli tarafında haftalık ders programı görüntüleme ekle
* [ ] Veli tarafında ödeme durumu görüntüleme ekle
* [ ] Galeri modülünü aktif et
* [ ] Belgeler modülünü aktif et
* [ ] Mesajlaşma modülünü aktif et

### Faz 4 — Güvenlik ve Üretim Borçları

* [ ] Firebase Auth’a geçiş
* [ ] Düz metin şifre kullanımını kaldırma
* [ ] Firebase Database Rules güçlendirme
* [ ] `kresId` bazlı veri izolasyonunu zorunlu hale getirme
* [ ] Yönetici dashboard istatistiklerini `kresId` filtresiyle sayacak hale getirme
* [ ] Veli sadece kendi çocuğuna ait verileri görebilmeli
* [ ] Öğretmen sadece kendi sınıfındaki çocukları yönetebilmeli
* [ ] Çoklu kreş desteğini güvenli hale getirme

---

## Şimdilik Yapılmayacaklar

* Firebase Auth geçişi
* Push notification
* Web panel
* SuperAdmin panel
* Online ödeme entegrasyonu
* Çoklu kreş abonelik sistemi
* Market yayını için son optimizasyonlar

---

## Ürün Konumlandırması

Yumurcak Kreş, küçük ve orta ölçekli kreşler için sade, anlaşılır ve hızlı kullanılabilir bir dijital iletişim aracıdır.

Değer önerisi:

> Veliler çocuklarının günlük durumunu düzenli takip eder, kreşler daha profesyonel ve güvenilir görünür.

---

## Geliştirici

**Faruk Kurtuluş**

GitHub: [furukcell](https://github.com/furukcell)

---

## Durum

Proje aktif geliştirme / MVP stabilizasyon aşamasındadır.

Öncelikli hedef:

> Yönetici sınıf-öğretmen-veli-çocuk ilişkisini kursun, öğretmen günlük rapor girsin, veli kendi telefonundan o raporu görsün.
