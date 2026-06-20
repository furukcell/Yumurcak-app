# Yumurcak Kreş

**Yumurcak Kreş**, kreş yönetimi, öğretmen ve veli arasındaki günlük iletişimi dijitalleştirmek için geliştirilen React Native / Expo tabanlı mobil takip uygulamasıdır.

Uygulama ile:

* Yönetici; sınıf, çocuk, öğretmen, veli, duyuru, ödeme, ders programı, etkinlik, kurum bilgileri, abonelik ve mesajlaşma süreçlerini yönetebilir.
* Öğretmen; kendi sınıfındaki çocuklar için günlük rapor girebilir, yoklama alabilir, velilerle ve kurum yönetimiyle mesajlaşabilir.
* Veli; sadece kendisine bağlı çocuğun bilgilerini, günlük raporlarını, yoklama durumunu, duyuruları, yemek listesini, etkinlikleri ve kurum iletişim bilgilerini görebilir.

Proje şu anda **Android APK / MVP geliştirme, Firebase Auth geçişi ve gerçek cihaz test aşamasındadır**.

---

## Güncel Durum

* Android APK açılıyor.
* Firebase Realtime Database bağlantısı çalışıyor.
* Firebase Storage bağlantısı eklendi.
* Firebase Auth altyapısı kuruldu.
* Kullanıcı adı / şifre ile eski giriş sistemi çalışıyor.
* Firebase Auth’a hibrit geçiş sistemi eklendi.
* Rol bazlı yönlendirme çalışıyor.
* Yönetici, öğretmen ve veli panelleri ayrılmış durumda.
* Yönetici dashboard modern mor/beyaz tasarıma geçirildi.
* Veli paneli modern mobil arayüze geçirildi.
* Öğretmen paneli modern mobil arayüze geçirildi.
* Kreş adı yönetici, öğretmen ve veli panellerinde görünür hale getirildi.
* Safe area / Android üst bar düzenlemeleri yapıldı.
* Yönetici panelinde sınıf, çocuk, öğretmen, veli, duyuru, ödeme, ders programı ve etkinlik yönetimi çalışıyor.
* Öğretmen günlük rapor girebiliyor.
* Öğretmen yoklama alabiliyor.
* Veli günlük raporları görebiliyor.
* Veli yoklama geçmişini görebiliyor.
* Öğretmen ve yönetici yemek listesi / duyuru / etkinlik akışları kullanılabilir hale getirildi.
* Veli tarafında yemek listesi, duyuru ve etkinlik görüntüleme eklendi.
* Yönetici, öğretmen ve veli mesajlaşma sistemi eklendi.
* Yönetici velilerle ve öğretmenlerle mesajlaşabiliyor.
* Veli öğretmenle ve kurum yönetimiyle mesajlaşabiliyor.
* Öğretmen velilerle ve kurum yönetimiyle mesajlaşabiliyor.
* Kurum bilgileri ekranı eklendi.
* Veli tarafında kurum iletişim ekranı eklendi.
* Profil fotoğrafı galeri seçimi ve Firebase Storage yükleme eklendi.
* Abonelik / demo / promosyon altyapısı eklendi.
* Firebase Rules için pilot ve production taslakları hazırlandı.
* Codemagic üzerinden release APK alınabiliyor.

---

## Proje Amacı

Kreşlerde velilerin en çok merak ettiği konular:

* Çocuğum bugün nasıldı?
* Yemek yedi mi?
* Uyudu mu?
* Yoklaması nasıl?
* Öğretmen notu var mı?
* Kreşten duyuru veya etkinlik bilgisi var mı?
* Kurumla veya öğretmenle hızlıca iletişime geçebilir miyim?

Yumurcak Kreş, bu bilgileri WhatsApp grupları yerine daha düzenli, güvenli, takip edilebilir ve profesyonel bir sisteme taşımayı hedefler.

---

## Kullanıcı Rolleri

| Rol        | Açıklama                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| `yonetici` | Kreş yönetimi. Sınıf, çocuk, öğretmen, veli, duyuru, ödeme, abonelik, kurum bilgileri ve diğer yönetim işlemlerini yapar. |
| `ogretmen` | Kendi sınıfındaki çocuklar için günlük rapor girer, yoklama alır, velilerle ve yönetimle mesajlaşır.                      |
| `veli`     | Sadece kendisine bağlı çocuğun bilgilerini, raporlarını ve ilgili içerikleri görüntüler.                                  |

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
10. Yoklama alır.
11. Veli giriş yapar.
12. Kendisine bağlı çocuğun raporunu ve yoklama durumunu görüntüler.
13. Veli öğretmenle veya kurum yönetimiyle mesajlaşır.
14. Yönetici abonelik / demo / promo sürecini yönetir.
15. Yönetici Firebase Auth geçiş ekranından kullanıcıları Auth sistemine taşır.

---

## Teknolojiler

* Expo SDK 54
* React Native
* JavaScript
* Firebase Realtime Database
* Firebase Auth
* Firebase Storage
* AsyncStorage
* React Navigation
* Expo Image Picker
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
yoklamalar/
duyurular/
yemekListeleri/
odemeler/
dersProgramlari/
etkinlikler/
mesajKonusmalari/
mesajlar/
abonelikler/
promosyonKodlari/
promosyonKullanimlari/
authKullaniciIndex/
medikalBilgiler/
```

---

## Kullanıcılar

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
  authUid
  email
  authProvider
  authMigratedAt
  profilFotoUrl
  createdAt
  updatedAt
```

Firebase Auth geçişinden sonra kullanıcıda şu alanlar oluşur:

```txt
authUid: firebaseAuthUid
email: kullaniciAdi@yumurcak.local
authProvider: firebase
authMigratedAt
```

Auth eşleme yapısı:

```txt
authKullaniciIndex/{firebaseAuthUid} = eskiKullaniciId
```

---

## Çocuklar

```txt
cocuklar/{cocukId}
  ad
  soyad
  dogumTarihi
  kresId
  sinifId
  veliIds
  ogretmenId
  createdAt
  updatedAt
```

Veli çocuğu görebilsin diye çocuk kaydında şu bağlantı olmalıdır:

```txt
veliIds: ["veli001"]
```

---

## Günlük Raporlar

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
  updatedAt
```

Yemek alanı detaylı yapıdadır:

```txt
yemek:
  kahvalti:
    durum
    not
  ogle:
    durum
    not
  araOgun:
    durum
    not
```

---

## Yoklamalar

```txt
yoklamalar/{tarih}_{cocukId}
  id
  kresId
  sinifId
  cocukId
  ogretmenId
  tarih
  durum
  createdAt
  updatedAt
```

Örnek durumlar:

```txt
geldi
gelmedi
izinli
gec
```

---

## Duyurular

```txt
duyurular/{duyuruId}
  kresId
  sinifId
  baslik
  icerik
  hedefRol
  olusturanRol
  createdAt
```

---

## Yemek Listeleri

```txt
yemekListeleri/{listeId}
  kresId
  sinifId
  tip: gunluk / haftalik / aylik
  baslik
  tarih
  baslangicTarihi
  bitisTarihi
  aktif
  ogunler
  createdAt
```

---

## Ödemeler

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

---

## Ders Programları

```txt
dersProgramlari/{sinifId}
  kresId
  sinifId
  gunler
  createdAt
```

---

## Etkinlikler

```txt
etkinlikler/{etkinlikId}
  kresId
  baslik
  tarih
  saat
  sinifId
  sinifIds
  aciklama
  aktif
  createdAt
```

---

## Mesajlaşma

Mesajlaşma iki ana node üzerinden çalışır:

```txt
mesajKonusmalari/
mesajlar/
```

Konuşma ID yapıları:

```txt
admin_{adminId}_veli_{veliId}
admin_{adminId}_ogretmen_{teacherId}
veli_{veliId}_ogretmen_{teacherId}_cocuk_{cocukId}
```

Konuşma meta yapısı:

```txt
mesajKonusmalari/{conversationId}
  id
  tip
  kresId
  adminId
  veliId
  ogretmenId
  hedefId
  hedefRol
  cocukId
  sinifId
  katilimcilar
  roller
  baslik
  sonMesaj
  sonMesajAt
  aktif
  updatedAt
```

Mesaj yapısı:

```txt
mesajlar/{conversationId}/{messageId}
  metin
  gonderenId
  gonderenRol
  createdAt
```

---

## Abonelik / Demo / Promo

Başlangıç fiyatlandırması:

```txt
İlk 1 ay ücretsiz
Aylık: 1.000 TL
Yıllık: 10.000 TL
```

Firebase node yapısı:

```txt
abonelikler/{kresId}
  kresId
  plan: demo / aylik / yillik
  durum: demo / aktif / pasif
  baslangicTarihi
  bitisTarihi
  demoBitisTarihi
  fiyat
  paraBirimi
  kaynak
  promoKod
  revenueCatCustomerId
  revenueCatEntitlement
  createdAt
  updatedAt
```

Promo yapısı:

```txt
promosyonKodlari/{kod}
  kod
  tip
  sureAy
  aktif
  maksimumKullanim
  kullanimSayisi
  createdAt
```

Promo kullanım kaydı:

```txt
promosyonKullanimlari/{kresId}_{kod}
  kresId
  kod
  kullaniciId
  kullanildiAt
  verilenAy
```

Varsayılan pilot kodlar:

```txt
PILOT1AY  -> 1 ay demo
PILOT3AY  -> 3 ay demo
KRES2026  -> 3 ay demo
```

RevenueCat ileride entegre edilecektir.

Önerilen RevenueCat ürün ID’leri:

```txt
yumurcak_aylik
yumurcak_yillik
```

Önerilen entitlement:

```txt
premium
```

---

## Profil Fotoğrafı

Veli profil fotoğrafı Firebase Storage’a yüklenir.

Storage yolu:

```txt
profilFotograflari/veliler/{parentId}.jpg
```

Realtime Database kaydı:

```txt
kullanicilar/{parentId}/profilFotoUrl
```

Veli profil ekranında:

* Galeriden fotoğraf seçme
* Firebase Storage’a yükleme
* URL ile fotoğraf ekleme
* Fotoğraf kaldırma

özellikleri bulunur.

---

## Firebase Auth Geçişi

Proje şu anda Firebase Auth’a hibrit geçiş sistemine sahiptir.

Login akışı:

```txt
1. Kullanıcı adı alınır
2. kullanıcıAdı@yumurcak.local formatında email üretilir
3. Firebase Auth ile giriş denenir
4. Auth başarılıysa authKullaniciIndex üzerinden eski kullanıcı kaydı bulunur
5. Auth başarısızsa eski RTDB kullanıcı adı/şifre sistemi fallback olarak çalışır
```

Bu sayede geçiş sırasında uygulama kilitlenmez.

Auth geçiş ekranı yönetici panelindedir:

```txt
Yönetici Paneli > Firebase Auth Geçişi
```

Auth geçiş ekranı şunları yapar:

* `authUid` olmayan kullanıcıları listeler
* Firebase Auth hesabı oluşturur
* Kullanıcıya `authUid` yazar
* `authKullaniciIndex/{authUid}` kaydı oluşturur
* Log gösterir

Önemli:

Firebase Auth en az 6 karakter şifre ister.
Şifresi 6 karakterden kısa olan kullanıcılar Auth geçişinde atlanır.

---

## Firebase Rules

FAZ 9 ile Firebase Rules dosyaları hazırlandı.

Dosyalar:

```txt
firebase/database.rules.pilot.json
firebase/database.rules.production-auth.json
firebase/storage.rules.pilot
firebase/storage.rules.production-auth
```

Şu an önerilen kullanım:

```txt
Realtime Database:
firebase/database.rules.pilot.json

Firebase Storage:
firebase/storage.rules.pilot
```

Production Auth rules hemen uygulanmamalıdır.

Önce:

```txt
1. Firebase Auth Geçişi ekranı çalıştırılmalı
2. Tüm kullanıcıların authUid aldığı doğrulanmalı
3. Admin / öğretmen / veli girişleri test edilmeli
4. Mesaj, rapor, yoklama, profil fotoğrafı test edilmeli
5. Sonra production-auth rules denenmeli
```

Production rules:

```txt
firebase/database.rules.production-auth.json
firebase/storage.rules.production-auth
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

## Örnek Firebase Test Verisi

```txt
kullanicilar/testuid001:
  ad: Test
  soyad: Yonetici
  aktif: true
  kresId: kres001
  kullaniciAdi: admin
  rol: yonetici
  sifre: abc123
```

```txt
kresler/kres001:
  ad: Yumurcak Kreş
  adres: Test Mahallesi
  telefon: 5001234567
  yoneticiId: testuid001
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

Notlar:

* Codemagic’te **Build branch: main** seçilmelidir.
* Eski commit seçilirse eski hatalar tekrar görülebilir.
* Build almadan önce son commit’in GitHub’a gittiği kontrol edilmelidir.

---

## Build Öncesi Kontrol Listesi

Build almadan önce şu kontroller yapılmalıdır:

```txt
1. npm install --legacy-peer-deps çalışmalı
2. npx expo start --clear ile uygulama açılmalı
3. App.js hata vermemeli
4. Firebase config doğru olmalı
5. Firebase Realtime Database bağlantısı çalışmalı
6. Firebase Storage bağlantısı çalışmalı
7. Admin eski sistemle giriş yapabilmeli
8. Firebase Auth Geçişi ekranı açılmalı
9. Auth migration çalışmalı
10. Firebase Console Authentication içinde kullanıcılar oluşmalı
11. Çıkış / tekrar giriş test edilmeli
12. Admin paneli açılmalı
13. Öğretmen paneli açılmalı
14. Veli paneli açılmalı
15. Günlük rapor test edilmeli
16. Yoklama test edilmeli
17. Duyuru test edilmeli
18. Yemek listesi test edilmeli
19. Etkinlik test edilmeli
20. Mesajlaşma test edilmeli
21. Profil fotoğraf yükleme test edilmeli
```

---

## Expo Çalıştırma

```bash
npm install --legacy-peer-deps
npx expo start --clear
```

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
* Veli / öğretmen / yönetici mesajlaşma altyapısı eklendi.
* Firebase Storage profil fotoğrafı desteği eklendi.
* Firebase Auth hibrit geçiş altyapısı eklendi.

---

## Tamamlanan Fazlar

### FAZ 1 — Mesajlaşma

* Veli - öğretmen mesajlaşması
* Ortak mesaj detay ekranı
* Firebase `mesajKonusmalari` ve `mesajlar` yapısı

### FAZ 2 — Yoklama ve Günlük Rapor

* Öğretmen yoklama ekranı
* Günlük rapor ekranı
* Veli günlük rapor görüntüleme
* Veli yoklama geçmişi
* Detaylı yemek durumu

### FAZ 3 — Duyuru / Etkinlik / Yemek

* Öğretmen duyuru oluşturabilir
* Veli duyuruları görebilir
* Öğretmen etkinlik oluşturabilir
* Veli etkinlikleri görebilir
* Öğretmen yemek listesi girebilir
* Veli yemek listesini görebilir

### FAZ 4 — Kurum Bilgileri ve Profil

* Yönetici kurum bilgilerini düzenleyebilir
* Veli kurum iletişim bilgilerini görebilir
* Profil URL alanı eklendi

### FAZ 5 — Abonelik / Ödeme / Promo

* İlk 1 ay ücretsiz demo
* Aylık 1.000 TL
* Yıllık 10.000 TL
* Promo kod sistemi
* RevenueCat hazırlık alanı

### FAZ 6 — Kreş Adı / Safe Area

* Panellerde kreş adı görünür
* Yumurcak marka alt başlık olarak kalır
* Safe area düzenlemesi yapıldı

### FAZ 7 — Admin Mesajlaşma

* Yönetici velilerle mesajlaşabilir
* Yönetici öğretmenlerle mesajlaşabilir
* Veli kurum yönetimiyle mesajlaşabilir
* Öğretmen kurum yönetimiyle mesajlaşabilir

### FAZ 8 — Profil Fotoğrafı

* Veli galeriden fotoğraf seçebilir
* Firebase Storage’a yüklenir
* Profil URL’i kullanıcı kaydına yazılır

### FAZ 9 — Firebase Rules

* Pilot rules hazırlandı
* Production Auth rules taslağı hazırlandı
* Storage rules hazırlandı

### FAZ 10 — Firebase Auth Geçişi

* Firebase Auth login desteği eklendi
* Eski RTDB login fallback korundu
* Auth migration ekranı eklendi
* authUid / authKullaniciIndex eşleme sistemi kuruldu

---

## Yol Haritası

### Faz 11 — Build Temizlik ve Son Test

* [ ] Gerçek cihazda admin akışını test et
* [ ] Gerçek cihazda öğretmen akışını test et
* [ ] Gerçek cihazda veli akışını test et
* [ ] Günlük rapor giriş / görüntüleme test et
* [ ] Yoklama giriş / görüntüleme test et
* [ ] Mesajlaşma test et
* [ ] Profil fotoğraf yükleme test et
* [ ] Firebase Auth migration test et
* [ ] Boş veri ekranlarını kontrol et
* [ ] Tüm butonlarda loading / disabled state kontrol et

### Faz 12 — RevenueCat Ödeme Entegrasyonu

* [ ] Aylık abonelik
* [ ] Yıllık abonelik
* [ ] Entitlement kontrolü
* [ ] Abonelik bitiş kontrolü
* [ ] Demo bitiş uyarısı

### Faz 13 — Firebase Auth Production Rules

* [ ] Tüm kullanıcıların authUid aldığı doğrulanacak
* [ ] Admin / öğretmen / veli girişleri test edilecek
* [ ] Production database rules uygulanacak
* [ ] Production storage rules uygulanacak
* [ ] Veli sadece kendi çocuğunu görecek
* [ ] Öğretmen sadece kendi sınıfını görecek
* [ ] Yönetici sadece kendi kreşini yönetecek

### Faz 14 — Pilot Kreş Demo

* [ ] 1 pilot kreş oluştur
* [ ] Gerçek öğretmen hesabı oluştur
* [ ] Gerçek veli hesabı oluştur
* [ ] Gerçek çocuk kayıtları ekle
* [ ] Demo kullanımını başlat
* [ ] 1 ay ücretsiz kullanım ver
* [ ] Demo sonrası satış görüşmesi yap

---

## Şimdilik Yapılmayacaklar

* Web panel
* SuperAdmin panel
* RevenueCat aktif ödeme
* Market yayını için son optimizasyonlar
* Çoklu ülke / dil desteği
* Gelişmiş bildirim sistemi

---

## Ürün Konumlandırması

Yumurcak Kreş, küçük ve orta ölçekli kreşler için sade, anlaşılır ve hızlı kullanılabilir bir dijital iletişim aracıdır.

Değer önerisi:

> Veliler çocuklarının günlük durumunu düzenli takip eder, kreşler daha profesyonel ve güvenilir görünür.

Başlangıç fiyatlandırması:

```txt
İlk 1 ay ücretsiz
Aylık: 1.000 TL
Yıllık: 10.000 TL
```

---

## Geliştirici

**Faruk Kurtuluş**

GitHub: [furukcell](https://github.com/furukcell)

---

## Durum

Proje aktif geliştirme / MVP stabilizasyon aşamasındadır.

Öncelikli hedef:

> Yönetici sınıf-öğretmen-veli-çocuk ilişkisini kursun, öğretmen günlük rapor ve yoklama girsin, veli kendi telefonundan bu bilgileri görsün, kurumla mesajlaşabilsin.

Kısa karar:

> Yumurcak artık fikir aşamasını geçmiş, çalışan MVP seviyesine gelmiş bir kreş yönetim uygulamasıdır. Pilot kreş demosuna hazırlanabilir; ancak ücretli müşteri öncesi gerçek cihaz testleri tamamlanmalıdır.
