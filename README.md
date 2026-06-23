# Yumurcak Kreş

Yumurcak Kreş; yönetici, öğretmen ve veli panelleri olan Expo / React Native tabanlı mobil kreş takip uygulamasıdır.

Proje çalışan MVP + stabilizasyon seviyesindedir. Kod tarafında ana modüller büyük ölçüde tamamlanmıştır. Güncel odak; gerçek cihaz testi, Firebase güvenlik kuralları, RevenueCat / Google Play abonelik testi, push notification fiziksel cihaz testi ve Play Store kapalı test hazırlığıdır.

> Son güncelleme: 23 Haziran 2026

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
- Firebase Realtime Database bağlantısı
- Firebase Storage profil fotoğrafı ve galeri altyapısı
- Kreş bazlı genel tema sistemi
- Sınıf bazlı tema altyapısı ve öğretmen sınıf tema ekranı
- Admin tema ekranında desenli / temalı arka plan
- Veli ve öğretmen anasayfa kartlarında pastel renkli görünüm
- Veli alt tab yapısı ve safe-area uyumu
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
- Yemek listesi görüntüleme / öğretmen günlük yemek listesi girişi
- Admin abonelik ekranı
- RevenueCat SDK altyapısı
- Anket / oylama
- Mesajlaşma
- Mesaj meta verisinde `undefined` temizleme ile yanlış hata alerti riskinin azaltılması
- Galeri
- Uygulama içi bildirim merkezi
- Expo push notification altyapısı
- Başarı toast sistemi
- Uygulama içi yasal metinler: Kullanım Şartları, Gizlilik Politikası, KVKK Aydınlatma Metni
- Android navigation bar gizleme altyapısı

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

Not: `ThemeProvider` sınıf temasını okuyacak altyapıya sahiptir. `RootNavigator` şu an `kullanici.sinifId` bilgisini `ThemeProvider` içine aktarır. Öğretmen veya veli kullanıcı kayıtlarında `sinifId` her zaman dolu değilse, sınıf teması yayılımı için sonraki kontrolde RootNavigator sınıf tespit mantığı güçlendirilmelidir.

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

## Yemek Listesi

Mevcut durum:

- Veli panelinde yemek listesi görüntüleme ekranı vardır.
- Öğretmen tarafında günlük yemek listesi girişi vardır.
- Yemek kayıtları `yemekListeleri` node’u üzerinden okunur.
- Bugünün menüsü tarih eşleşmesiyle veli ekranına çekilebilir.

Önerilen sıradaki geliştirme:

- Admin için aylık yemek listesi ekranı.
- Admin ay seçip 30/31 günlük kahvaltı / öğle / ara öğün planı girebilir.
- Yayınla butonu ile her gün için `yemekListeleri` altına günlük kayıt basılır.
- Böylece mevcut veli günlük yemek ekranı büyük değişiklik istemeden çalışır.

A4/PDF yükleme notu:

- İlk aşamada A4/PDF dosyası ek belge olarak yüklenebilir.
- Belgeden otomatik menü çıkarma için OCR/AI gerekir; tablo ve fotoğraf kalitesi nedeniyle sonraki faza bırakılması önerilir.

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

---

## Öğretmen Paneli

Güncel durum:

- Öğretmen anasayfa kartları pastel renkli hale getirildi.
- Öğretmen günlük rapor oluşturur.
- Öğretmen yoklama girer.
- Öğretmen medikal bilgileri görür/günceller.
- Öğretmen fiziksel gelişim bilgisi girer.
- Öğretmen kendi sınıfına galeri paylaşımı yapabilir.
- Öğretmen sınıf teması seçebilir.
- Öğretmen mesajlaşma ve bildirim ekranlarına erişir.

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
3. Öğretmen günlük rapor ve yoklama girer.
4. Öğretmen fiziksel gelişim kaydı girer.
5. Öğretmen sınıf teması seçer.
6. Aynı sınıftaki öğretmen/veli sınıf temasını görür.
7. Admin / öğretmen galeriye fotoğraf veya video yükler.
8. Veli galeri ekranında sadece kendi çocuğuna/sınıfına/kurumuna ait aktif kayıtları görür.
9. Admin ödeme kaydı oluşturur.
10. Veli ödeme ekranında son 12 ay ve tüm kayıtları görür.
11. Admin abonelik ekranında demo/promo/manual abonelik akışı kontrol edilir.
12. RevenueCat ekranında ürün yokken güvenli uyarı geldiği kontrol edilir.
13. Ödeme, anket ve kurum zili ekranları açılır.
14. Veli özet ekranında günlük veriler ve profil fotoğrafı görünür.
15. Veli ve öğretmen anasayfa kartları pastel görünür.
16. Tema değişimi admin / veli / öğretmen ekranlarına yansır.
17. Admin / öğretmen / veli bildirim ekranları açılır.
18. Mesaj gönderimi sonrası mesaj gitmesine rağmen yanlış hata alerti çıkmadığı test edilir.
19. Fiziksel cihazda push token ve push bildirim testi yapılır.
20. Android navigation bar davranışı gerçek cihazda test edilir.
21. Giriş ekranından Kullanım Şartları, Gizlilik Politikası ve KVKK metni açılır.
22. Veli, öğretmen ve admin profil/ayar alanlarından yasal metinler açılır.

---

## Kalan Büyük İşler

- Google Play Console abonelik ürünlerini oluşturma
- RevenueCat Google Play service account bağlantısı
- RevenueCat ürünlerini gerçek Google Play ürünlerine bağlama
- Gerçek satın alma / restore testi
- Push notification gerçek cihaz uçtan uca testi
- Firebase Rules production güvenliği
- Cloud Functions ile 24 saatten eski galeri medyasını garantili silme
- Admin aylık yemek listesi ekranı
- A4/PDF yemek listesi ek dosya yükleme
- A4/PDF içinden otomatik menü çıkarma için sonraki faz OCR/AI değerlendirmesi
- Öğretmen sınıf temasının veli tarafına yansımasının gerçek kullanıcı verisiyle test edilmesi
- Mesaj gönderim hatası düzeltmesinin gerçek cihazda doğrulanması
- Gerçek cihazda uçtan uca test
- Play Store kapalı test / üretim build süreci

---

## Geliştirici

Faruk Kurtuluş

---

## Durum

Yumurcak aktif geliştirme / MVP stabilizasyon aşamasındadır. Ana admin, öğretmen ve veli modülleri çalışır durumdadır. Galeri hedefleme, ödeme takibi, veli günlük/aylık rapor ekranı, medikal bilgi akışı, fiziksel gelişim girişi, yasal metinler, tema sistemi, sınıf teması altyapısı, admin ödeme modülü, RevenueCat kod altyapısı, uygulama içi bildirim merkezi, push notification altyapısı, başarı toast sistemi ve görsel/pastel arayüz iyileştirmeleri eklenmiştir. Sıradaki kritik işler gerçek cihaz testleri, Google Play abonelik bağlantıları, Firebase Rules production güvenliği, push testi ve admin aylık yemek listesi modülüdür.
