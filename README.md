# Yumurcak Kreş

Yumurcak Kreş; yönetici, öğretmen ve veli panelleri olan Expo / React Native tabanlı mobil kreş takip uygulamasıdır.

Proje çalışan MVP + stabilizasyon seviyesindedir. Kod tarafında ana admin, öğretmen ve veli modülleri büyük ölçüde tamamlanmıştır. Güncel odak; gerçek cihaz testi, Firebase Storage / Realtime Database kurallarının doğrulanması, RevenueCat / Google Play abonelik bağlantısı, push notification fiziksel cihaz testi ve Play Store kapalı test hazırlığıdır.

> Son güncelleme: 24 Haziran 2026

---

## Teknoloji

```txt
Expo SDK: 54
React Native: 0.81.5
React: 19.1.0
Firebase: 12.0.0
RevenueCat: react-native-purchases 9.0.0
Push: expo-notifications
Storage / fotoğraf: expo-image-picker + Firebase Storage
Android sistem bar: expo-navigation-bar
Android klavye davranışı: softwareKeyboardLayoutMode = resize
```

---

## Uygulama Bilgileri

```txt
Uygulama adı: Yumurcak Kreş
Android package: com.furukcell.yumurcakapp
App version: 1.0.0
Android versionCode: 1
compileSdkVersion: 35
targetSdkVersion: 35
minSdkVersion: 24
```

---

## Roller

| Rol | Yetki |
| --- | --- |
| `superadmin` | Platform / kreş yönetimi ve üst seviye işlemler |
| `yonetici` | Kurum, sınıf, çocuk, öğretmen, veli, ödeme, anket, galeri, tema, abonelik, bildirim, yasal metin ve istatistik yönetimi |
| `ogretmen` | Sınıf çocukları, yoklama, günlük rapor, fiziksel gelişim, mesaj, galeri, yemek listesi, medikal bilgi, sınıf teması ve bildirim ekranları |
| `veli` | Çocuğa ait özet, rapor, ödeme, anket, mesaj, galeri, yemek listesi, gelişim, medikal bilgi, bildirim ve yasal metin ekranları |

---

## Güncel Modüller

- Rol bazlı giriş ve yönlendirme
- Firebase Auth tabanlı yeni kullanıcı oluşturma akışı
- Firebase Realtime Database bağlantısı
- Firebase Storage profil fotoğrafı, galeri ve yemek fotoğrafı altyapısı
- Kreş bazlı genel tema sistemi
- Sınıf bazlı tema altyapısı ve öğretmen sınıf tema ekranı
- Öğretmen sınıf teması seçince aynı sınıf öğretmen / veli ekranlarına tema yansıması
- Admin tema ekranında desenli / temalı arka plan
- Veli ve öğretmen anasayfa kartlarında pastel renkli görünüm
- Veli alt tab yapısı ve safe-area uyumu
- Admin dashboard safe-area düzeltmesi
- Veli günlük özet ekranı
- Veli profil fotoğrafının anasayfa ve özet alanlarına yansıması
- Yönetici kurum istatistikleri
- Öğretmen ve çocuk bazlı istatistik / risk ekranı
- Kurum Zili
- Hedefli duyuru sistemi: tüm kurum, veli, öğretmen, sınıf
- Ödeme takibi
- Admin ödeme listesi ve ödeme formu
- Veli son 12 ay ödeme ekranı
- Veli günlük / aylık rapor ekranı
- Öğretmen günlük rapor oluşturma ekranı
- Öğretmen fiziksel gelişim girişi: boy, kilo, baş çevresi, not
- Öğretmen günlük yemek listesi girişi
- Kahvaltı / öğle / ara öğün için kamera veya galeriden yemek fotoğrafı ekleme
- Veli yemek ekranında fotoğraflı günlük yemek görüntüleme
- Günlük yemeklerde son 7 gün listeleme ve eski yemek fotoğraflarını temizleme altyapısı
- Admin abonelik ekranı
- RevenueCat SDK altyapısı
- Anket / oylama
- Mesajlaşma
- Chat ekranı Android klavye resize düzeltmesi
- Mesaj meta verisinde `undefined` temizleme ile yanlış hata alerti riskinin azaltılması
- Galeri
- Uygulama içi bildirim merkezi
- Expo push notification altyapısı
- Başarı toast sistemi
- Uygulama içi yasal metinler: Kullanım Şartları, Gizlilik Politikası, KVKK Aydınlatma Metni
- Android navigation bar gizleme altyapısı
- Kullanıcıya görünen tarih formatlarında `DD.MM.YYYY` gösterim standardı

---

## Tema Sistemi

Tema sistemi iki katmanlıdır.

### 1. Kreş genel teması

Yönetici tarafından seçilir ve Firebase tarafında kreş kaydına yazılır.

```txt
kresler/{kresId}/temaAyarlari
  temaId
  patternEnabled
  updatedAt
```

Bu tema, sınıf özel teması olmayan kullanıcılar için varsayılan görünüm olarak kullanılır.

### 2. Sınıf teması

Öğretmen tarafından kendi sınıfı için seçilir.

```txt
kresler/{kresId}/sinifTemalari/{sinifId}
  temaId
  patternEnabled
  updatedAt
  updatedBy
```

Amaç:

```txt
Öğretmen tema seçer
↓
Sadece o sınıfın öğretmenleri ve velileri aynı sınıf temasını görür
↓
Diğer sınıflar etkilenmez
```

Güncel durum:

- `ThemeProvider` kreş genel teması ve sınıf teması okuyabilir.
- `RootNavigator` öğretmen tarafında sınıfı `siniflar` üzerinden çözmeye çalışır.
- `RootNavigator` veli tarafında sınıfı `cocuklar` üzerinden çözmeye çalışır.
- Böylece kullanıcı kaydında `sinifId` boş olsa bile öğretmen / veli için sınıf teması bulunabilir.
- Bu akış gerçek kullanıcı verileriyle test edilmelidir.

---

## Yemek Listesi

Güncel durum:

- Veli panelinde yemek listesi görüntüleme ekranı vardır.
- Öğretmen tarafında günlük yemek listesi girişi vardır.
- Yemek kayıtları `yemekListeleri` node’u üzerinden okunur.
- Bugünün menüsü tarih eşleşmesiyle veli ekranına çekilir.
- Öğretmen kahvaltı / öğle / ara öğün için fotoğraf ekleyebilir.
- Fotoğraf kamera veya galeriden seçilebilir.
- Fotoğraflar Firebase Storage altında tutulur.
- Yemek kaydı içine hem `fotoUrl` hem `fotoPath` yazılır.
- Veli ekranı eski yazılı yemek kayıtlarını ve yeni fotoğraflı yemek kayıtlarını birlikte destekler.
- Veli ve öğretmen günlük liste ekranlarında son 7 günlük yemekler gösterilir.
- 7 günden eski günlük yemek kayıtları öğretmen yemek ekranı açıldığında temizlenmeye çalışılır.
- `fotoPath` bulunan eski yemek fotoğrafları Storage’dan silinmeye çalışılır.

Storage path:

```txt
yemekFotolari/{kresId}/{sinifId}/{timestamp}_{mealKey}.jpg
```

Realtime Database yapı örneği:

```txt
yemekListeleri/{id}
  kresId
  sinifId
  tarih
  ogunler
    kahvalti
      text
      fotoUrl
      fotoPath
    ogle
      text
      fotoUrl
      fotoPath
    ara
      text
      fotoUrl
      fotoPath
```

Sonraki faz:

- Admin için aylık yemek listesi ekranı.
- Admin ay seçip 30/31 günlük kahvaltı / öğle / ara öğün planı girebilir.
- Yayınla butonu ile her gün için `yemekListeleri` altına günlük kayıt basılır.
- A4/PDF yemek listesi ek belge olarak yüklenebilir.
- Belgeden otomatik menü çıkarma için OCR/AI gerekir; tablo ve fotoğraf kalitesi nedeniyle sonraki faza bırakılması önerilir.

---

## Galeri Modülü

Galeri modülü `galeri/` node’u ve Firebase Storage ile çalışır.

Yapı:

```txt
galeri/{mediaId}
  kresId
  sinifId
  cocukIds
  hedef: kurum | sinif | cocuk
  targetType: school | class | student
  classId
  studentId
  type: image | video
  url
  storagePath
  aciklama
  yukleyenId
  yukleyenAd
  yukleyenRol
  createdAt
  expiresAt
```

Kurallar:

- Yönetici fotoğraf / video yükleyebilir.
- Yönetici paylaşımı tüm kurum, sınıf veya tek çocuk hedefli yapabilir.
- Öğretmen kendi sınıfı veya seçili çocuk için fotoğraf / video yükleyebilir.
- Veli sadece kendi çocuğuna, çocuğunun sınıfına veya tüm kuruma ait aktif galeri kayıtlarını görür.
- Medyalar 24 saat sonra uygulamada görünmez.
- Yönetici / öğretmen galeri ekranı açıldığında süresi dolan kayıtlar temizlenmeye çalışılır.
- Storage’dan garantili otomatik silme için ileride Firebase Cloud Functions scheduled cleanup gerekir.

---

## Bildirim Sistemi

Bildirim sistemi 3 katmanlıdır.

### FAZ 1 — Uygulama içi bildirim merkezi

Tamamlandı.

- Bildirim merkezi servisi eklendi.
- Admin, öğretmen ve veli panellerine bildirim butonu eklendi.
- Ortak bildirim ekranı eklendi.
- Rol / kullanıcı / kurum bazlı bildirim okuma mantığı eklendi.

### FAZ 2 — Uygulama içi olay bildirimleri

Tamamlandı.

Aşağıdaki işlemler Firebase içine bildirim kaydı oluşturur:

- Admin duyuru oluşturunca seçili hedefe göre veli / öğretmen / sınıf bildirimi
- Admin ödeme kaydı oluşturunca ilgili veliye bildirim
- Veli kurum zili gönderince admin / öğretmen bildirimi
- Mesaj gönderilince alıcı kullanıcıya bildirim

### FAZ 3 — Push notification altyapısı

Kod altyapısı hazırlandı; gerçek cihaz testi gerekir.

- Expo push token alma akışı eklendi.
- Token kullanıcı kaydına yazılacak hale getirildi.
- Bildirim kaydı oluşturulurken uygun tokenlara Expo push gönderme mantığı eklendi.
- Fiziksel cihazda izin, token ve push bildirimi test edilmelidir.

---

## Başarı Toast Sistemi

Klasik `Alert.alert('Başarılı')` kullanımını azaltmak için ortak başarı toast componenti eklendi.

Dosya:

```txt
src/components/AppSuccessToast.js
```

Toast eklenen ekranlar:

- Admin duyuru formu
- Admin ödeme formu
- Admin çocuk formu
- Admin sınıf formu
- Admin veli formu
- Veli medikal bilgi ekranı
- Veli profil fotoğrafı ekranı
- Öğretmen günlük rapor ekranı

---

## Abonelik ve RevenueCat

Abonelik modeli kreş bazlıdır. Abonelik kaydı Firebase tarafında `abonelikler/{kresId}` altında tutulur.

Fiyatlandırma:

```txt
Aylık abonelik: 1.500 TL
Yıllık abonelik: 15.000 TL
İlk 1 ay: ücretsiz demo
```

RevenueCat durumu:

```txt
Project: YUMURCAK
Android app: YUMURCAK (Play Store)
Android package: com.furukcell.yumurcakapp
Public SDK key: goog_WqntzZwxdOpqOYBOtuKyYaMwfIg
Offering identifier: default
Packages: monthly, yearly
Entitlement identifier: YUMURCAK Pro
Entitlement display name: Premium
```

Kod tarafında eklenen RevenueCat dosyası:

```txt
src/services/revenueCat.js
```

Kod tarafında yapılanlar:

- Android public SDK key eklendi.
- RevenueCat configure altyapısı eklendi.
- `default` offering okuma altyapısı eklendi.
- `monthly` ve `yearly` paketleri okunmaya hazırlandı.
- Satın alma fonksiyonu eklendi.
- Satın alma geri yükleme fonksiyonu eklendi.
- RevenueCat sonucu başarılı olursa Firebase `abonelikler/{kresId}` kaydı güncellenecek şekilde hazırlandı.
- Admin abonelik ekranında RevenueCat debug kartları kaldırıldı; kullanıcıya sade abonelik deneyimi bırakıldı.
- Google Play ürünleri henüz bağlanmadıysa ekran güvenli şekilde uyarı verir; manuel/demo kullanım korunur.

Google Play kapalı test / ürün bağlama aşamasında unutulmaması gerekenler:

```txt
Google Play subscription product id:
- yumurcak_aylik_1500
- yumurcak_yillik_15000

RevenueCat bağlantısı:
- monthly package -> yumurcak_aylik_1500
- yearly package -> yumurcak_yillik_15000
- entitlement -> YUMURCAK Pro
- offering -> default
```

Not: Google Play ürünleri ve RevenueCat service account bağlantısı tamamlanmadan gerçek satın alma çalışmaz. Şu an RevenueCat iskeleti ve kod entegrasyonu hazırdır.

---

## Firebase Rules Durumu

Storage tarafında profil fotoğrafı ve yemek fotoğrafı için path bazlı yazma izni kullanılır.

Storage pathleri:

```txt
profilFotograflari/veliler/{fileName}
yemekFotolari/{kresId}/{sinifId}/{fileName}
```

Realtime Database tarafında geçiş rules seviyesi kullanılır:

```txt
.read  -> auth != null
.write -> auth != null
```

Ek olarak temel node’lar için `.indexOn` kuralları eklenmiştir. Bu aşama production rol bazlı kilitleme değildir. Amaç auth olmayan erişimi kapatmak, uygulamayı bozmadan pilot / kapalı test sürecine girmek ve sorgu performansını iyileştirmektir.

Production güvenlik fazında hedef:

- Superadmin tüm platformu yönetebilir.
- Admin sadece kendi `kresId` verilerini yönetebilir.
- Öğretmen sadece kendi `kresId` / `sinifId` verilerini yönetebilir.
- Veli sadece kendi çocuğu, çocuğunun sınıfı ve kurum genel hedefli verileri okuyabilir.
- Storage yazma / silme işlemleri rol ve path bazlı daraltılır.

---

## Veli Paneli

Alt tab yapısı:

```txt
📊 Özet
🏠 Anasayfa
📋 Raporlar
📈 Gelişim
💬 Mesaj
```

Güncel durum:

- Anasayfa kartları pastel renkli hale getirildi.
- Özet ekranındaki profil / avatar alanları veli profil fotoğrafı ile uyumlu hale getirildi.
- Ödeme ekranında son 12 ay ve tüm kayıtlar görünür.
- Rapor ekranında günlük ve aylık özet sekmeleri vardır.
- Aylık özet öğretmen raporlarından otomatik özet çıkarır; tıbbi/psikolojik tanı değildir.
- Yemek ekranında bugünün fotoğraflı menüsü ve son 7 günlük günlük yemek listesi görülebilir.
- Tarihler kullanıcıya `DD.MM.YYYY` formatında gösterilir.

---

## Öğretmen Paneli

Güncel durum:

- Öğretmen anasayfa kartları pastel renkli hale getirildi.
- Öğretmen dashboard sağ üst profil kısayolu öğretmen profiline gider.
- Öğretmen günlük rapor oluşturur.
- Öğretmen yoklama girer.
- Öğretmen medikal bilgileri görür/günceller.
- Öğretmen fiziksel gelişim bilgisi girer.
- Öğretmen kendi sınıfına galeri paylaşımı yapabilir.
- Öğretmen sınıf teması seçebilir.
- Öğretmen günlük yemek listesine kahvaltı / öğle / ara öğün fotoğrafı ekleyebilir.
- Öğretmen günlük yemek listesinde son 7 günlük kayıtları görür.
- Öğretmen yemek ekranı açıldığında 7 günden eski günlük yemek kayıtları ve uygun fotoğraflar temizlenmeye çalışılır.
- Öğretmen mesajlaşma ve bildirim ekranlarına erişir.

---

## Yönetici Paneli

Güncel durum:

- Yönetici kurum, sınıf, çocuk, öğretmen ve veli yönetimi yapabilir.
- Yönetici tema ayarlarını düzenleyebilir.
- Yönetici ödeme listesi ve ödeme formunu kullanabilir.
- Yönetici duyuru, anket, galeri, abonelik, bildirim ve yasal metin alanlarına erişebilir.
- Admin dashboard Android status bar / safe-area uyumu düzeltilmiştir.
- Admin ödeme listesinde dönem gösterimi kullanıcıya uygun tarih formatıyla gösterilir.

---

## Yasal Metinler

Uygulama içine aşağıdaki yasal metinler eklenmiştir:

```txt
Kullanım Şartları
Gizlilik Politikası
KVKK Aydınlatma Metni
```

Yasal metinlere erişim noktaları:

- Giriş ekranı alt bağlantıları
- Veli profili
- Öğretmen profili
- Yönetici kurum bilgileri / ayarlar ekranı

Yasal metinlerde galeri içeriklerinin fotoğraf/video içerebileceği ve uygulama içinde 24 saat görünür olacak şekilde tasarlandığı belirtilmiştir. Fiziksel Storage temizliği için sonraki fazda Cloud Functions önerilir.

---

## Build Öncesi Test

```bash
npm install
npx expo-doctor
npx expo start --clear
```

Test edilecek temel akış:

1. Admin giriş yapar.
2. Sınıf, öğretmen, veli ve çocuk bağlantıları kontrol edilir.
3. Öğretmen profil kısayolu test edilir.
4. Öğretmen günlük rapor ve yoklama girer.
5. Öğretmen fiziksel gelişim kaydı girer.
6. Öğretmen sınıf teması seçer.
7. Aynı sınıftaki öğretmen/veli sınıf temasını görür.
8. Öğretmen günlük yemek listesine kahvaltı / öğle / ara öğün fotoğrafı ekler.
9. Veli bugünün fotoğraflı yemek listesini görür.
10. Veli ve öğretmen yemek listesinde son 7 günlük kayıtlar görünür.
11. Admin / öğretmen galeriye fotoğraf veya video yükler.
12. Veli galeri ekranında sadece kendi çocuğuna/sınıfına/kurumuna ait aktif kayıtları görür.
13. Admin ödeme kaydı oluşturur.
14. Veli ödeme ekranında son 12 ay ve tüm kayıtları görür.
15. Admin abonelik ekranında demo/promo/manual abonelik akışı kontrol edilir.
16. RevenueCat ekranında ürün yokken güvenli uyarı geldiği kontrol edilir.
17. Ödeme, anket ve kurum zili ekranları açılır.
18. Veli özet ekranında günlük veriler ve profil fotoğrafı görünür.
19. Veli ve öğretmen anasayfa kartları pastel görünür.
20. Tema değişimi admin / veli / öğretmen ekranlarına yansır.
21. Admin / öğretmen / veli bildirim ekranları açılır.
22. Mesaj gönderimi sonrası mesaj gitmesine rağmen yanlış hata alerti çıkmadığı test edilir.
23. Admin / öğretmen / veli chat ekranlarında klavye açılınca mesaj inputu görünür kalır.
24. Admin dashboard üst alanının Android status bar altında düzgün başladığı test edilir.
25. Fiziksel cihazda push token ve push bildirim testi yapılır.
26. Android navigation bar davranışı gerçek cihazda test edilir.
27. Giriş ekranından Kullanım Şartları, Gizlilik Politikası ve KVKK metni açılır.
28. Veli, öğretmen ve admin profil/ayar alanlarından yasal metinler açılır.
29. Storage rules sonrası profil fotoğrafı ve yemek fotoğrafı upload test edilir.
30. Realtime Database rules sonrası admin / öğretmen / veli ana akışlarında permission error olmadığı test edilir.

---

## Google Play Öncesi Kontrol Listesi

```txt
- Expo doctor temiz olmalı.
- Android package doğru olmalı: com.furukcell.yumurcakapp
- versionCode kapalı test / yeni build için gerekirse artırılmalı.
- targetSdkVersion 35 olarak kalmalı.
- Firebase Storage foto upload test edilmeli.
- Realtime Database auth rules ile tüm roller test edilmeli.
- RevenueCat ürünleri Google Play ürünlerine bağlanmalı.
- Kapalı test kullanıcısı satın alma / restore akışını test etmeli.
- Push notification fiziksel cihazda test edilmeli.
- Uygulama içi yasal metinler erişilebilir olmalı.
- Play Store veri güvenliği formu, KVKK / gizlilik bilgilerine göre doldurulmalı.
- Çocuk / aile hedefli içerik hassasiyeti nedeniyle ekran görüntüleri ve açıklama metni dikkatli hazırlanmalı.
```

---

## Kalan Büyük İşler

- Google Play Console abonelik ürünlerini oluşturma
- RevenueCat Google Play service account bağlantısı
- RevenueCat ürünlerini gerçek Google Play ürünlerine bağlama
- Gerçek satın alma / restore testi
- Push notification gerçek cihaz uçtan uca testi
- Firebase Rules production rol bazlı güvenlik fazı
- Cloud Functions ile 24 saatten eski galeri medyasını garantili silme
- Cloud Functions ile eski yemek fotoğraflarını garantili silme
- Admin aylık yemek listesi ekranı
- A4/PDF yemek listesi ek dosya yükleme
- A4/PDF içinden otomatik menü çıkarma için sonraki faz OCR/AI değerlendirmesi
- Öğretmen sınıf temasının veli tarafına yansımasının gerçek kullanıcı verisiyle test edilmesi
- Mesaj gönderim / chat klavye düzeltmesinin gerçek cihazda doğrulanması
- Gerçek cihazda uçtan uca test
- Play Store kapalı test / üretim build süreci

---

## Yol Haritası

### FAZ 1 — MVP stabilizasyon

Durum: Büyük ölçüde tamamlandı.

- Admin / öğretmen / veli temel modülleri
- Firebase Auth tabanlı yeni kullanıcı akışı
- Realtime Database bağlantıları
- Storage profil / galeri / yemek foto altyapısı
- Tema sistemi
- Bildirim merkezi
- Mesajlaşma
- Ödeme takibi
- Rapor / gelişim / yoklama akışları
- Yasal metinler

### FAZ 2 — Kapalı test hazırlığı

Durum: Sıradaki aktif faz.

- Gerçek Android cihaz testi
- Storage upload / delete testi
- Database rules sonrası permission testleri
- RevenueCat Google Play ürün bağlantısı
- Kapalı test build alma
- Play Console kapalı test yayını
- Test kullanıcılarından geri bildirim toplama

### FAZ 3 — Production güvenlik ve temizlik

Durum: Kapalı test sonrası.

- Firebase Realtime Database role based rules
- Storage role based rules
- Cloud Functions scheduled cleanup
- Galeri ve yemek fotoğraflarında garantili fiziksel temizlik
- Log / hata takibi
- Performans ve index kontrolü

### FAZ 4 — Gelişmiş modüller

Durum: İlk yayın sonrası.

- Admin aylık yemek listesi ekranı
- A4/PDF yemek listesi yükleme
- OCR/AI ile menü çıkarma değerlendirmesi
- Gelişmiş abonelik / fatura / kurum yönetimi
- Gelişmiş push notification senaryoları

---

## Geliştirici

Faruk Kurtuluş

---

## Durum

Yumurcak aktif geliştirme / MVP stabilizasyon aşamasındadır. Ana admin, öğretmen ve veli modülleri çalışır durumdadır. Galeri hedefleme, ödeme takibi, veli günlük/aylık rapor ekranı, medikal bilgi akışı, fiziksel gelişim girişi, yasal metinler, tema sistemi, sınıf teması yayılımı, admin ödeme modülü, RevenueCat kod altyapısı, uygulama içi bildirim merkezi, push notification altyapısı, başarı toast sistemi, yemek fotoğrafı altyapısı, chat klavye düzeltmesi, admin safe-area düzeltmesi ve görsel/pastel arayüz iyileştirmeleri eklenmiştir. Sıradaki kritik işler gerçek cihaz testleri, Google Play abonelik bağlantıları, kapalı test build süreci, Firebase Rules production güvenliği ve push testidir.
