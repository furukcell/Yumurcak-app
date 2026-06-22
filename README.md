# Yumurcak Kreş

Yumurcak Kreş; yönetici, öğretmen ve veli panelleri olan Expo / React Native tabanlı mobil kreş takip uygulamasıdır.

Proje çalışan MVP seviyesindedir. Güncel odak; gerçek cihaz testi, kapalı test / production build hazırlığı, Google Play abonelik ürünleri, Firebase güvenlik kuralları ve sonraki faz olarak aylık yemek listesi akışıdır.

> Son durum: 22 Haziran 2026

---

## Roller

| Rol | Yetki |
| --- | --- |
| `superadmin` | Platform ve kreş yönetimi |
| `yonetici` | Kurum, sınıf, çocuk, öğretmen, veli, ödeme, anket, galeri, tema, abonelik, bildirim, yasal metin ve istatistik yönetimi |
| `ogretmen` | Sınıf çocukları, yoklama, günlük rapor, mesaj, galeri paylaşımı, yemek listesi, medikal bilgi ve bildirim ekranları |
| `veli` | Çocuğa ait özet, rapor, ödeme, anket, mesaj, galeri, yemek listesi, medikal bilgi, bildirim ve yasal metin ekranları |

---

## Güncel Modüller

- Rol bazlı giriş ve yönlendirme
- Firebase Realtime Database bağlantısı
- Firebase Storage profil fotoğrafı ve galeri altyapısı
- Kreş bazlı tema sistemi
- Veli alt tab yapısı ve safe-area uyumu
- Veli günlük özet ekranı
- Veli profil fotoğrafının anasayfa/özet alanlarına yansıması
- Yönetici kurum istatistikleri
- Öğretmen ve çocuk bazlı istatistik/risk ekranı
- Kurum Zili
- Duyuru sistemi
- Ödeme takibi
- Admin ödeme listesi ve ödeme formu
- Veli son 12 ay ödeme ekranı
- Veli günlük / aylık rapor ekranı
- Öğretmen günlük rapor oluşturma ekranı
- Yemek listesi görüntüleme / öğretmen günlük yemek listesi girişi
- Admin abonelik ekranı
- RevenueCat SDK altyapısı
- Anket / oylama
- Mesajlaşma
- Galeri
- Uygulama içi bildirim merkezi
- Expo push notification altyapısı
- Başarı toast sistemi
- Uygulama içi yasal metinler: Kullanım Şartları, Gizlilik Politikası, KVKK Aydınlatma Metni

---

## Bildirim Sistemi

Bildirim sistemi 3 katmanlı olacak şekilde hazırlanmıştır.

### FAZ 1 — Uygulama içi bildirim merkezi

Tamamlandı.

- Bildirim merkezi servisi eklendi.
- Admin, öğretmen ve veli panellerine bildirim butonu eklendi.
- Ortak bildirim ekranı eklendi.
- Rol / kullanıcı / kurum bazlı bildirim okuma mantığı eklendi.

### FAZ 2 — Uygulama içi olay bildirimleri

Tamamlandı.

Aşağıdaki işlemler Firebase içine bildirim kaydı oluşturur:

- Admin duyuru oluşturunca veli / öğretmen bildirimleri
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

Bu sistem kayıt/güncelleme sonrası üstten kısa süreli başarılı işlem bildirimi gösterir.

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

RevenueCat SDK bağımlılığı:

```txt
react-native-purchases
```

Kod tarafında yapılanlar:

- Android public SDK key eklendi.
- RevenueCat configure altyapısı eklendi.
- `default` offering okuma altyapısı eklendi.
- `monthly` ve `yearly` paketleri okunmaya hazırlandı.
- Satın alma fonksiyonu eklendi.
- Satın alma geri yükleme fonksiyonu eklendi.
- RevenueCat sonucu başarılı olursa Firebase `abonelikler/{kresId}` kaydı güncellenecek şekilde hazırlandı.
- Admin abonelik ekranında RevenueCat durumu, paket okuma, satın alma ve restore akışı bağlandı.
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
- Storage’dan garantili otomatik silme için ileride Firebase Cloud Functions scheduled cleanup önerilir.

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

## Veli Paneli

Alt tab yapısı:

```txt
📊 Özet
🏠 Anasayfa
📋 Raporlar
📈 Gelişim
💬 Mesaj
```

Anasayfadaki kartlar:

```txt
🔔 Kurum Zili
💳 Ödeme Takibi
🗳️ Anketler
☎️ Kurum İletişim
📋 Günlük Rapor
✅ Yoklama
🍽️ Yemek Listesi
🎉 Etkinlikler
📈 Gelişim
🩺 Medikal
🚌 Servis
📣 Duyurular
💬 Mesajlar
🖼️ Galeri
📁 Belgeler
```

Veli ödeme ekranı:

- Son 12 ay ödeme takibi gösterir.
- Tüm ödeme kayıtları ayrıca listelenir.
- Açık tutar, toplam tutar, ödenen ve geciken kayıt özeti gösterilir.
- Kayıt yoksa ay bazında `Kayıt yok` durumu gösterilir.

Veli rapor ekranı:

- Günlük rapor sekmesi vardır.
- Aylık özet sekmesi vardır.
- Aylık özet; öğretmen raporlarından otomatik özet çıkarır, tıbbi/psikolojik tanı değildir.

---

## Admin Ödeme Modülü

Admin ödeme ekranı:

- Ödemeleri listeler.
- Tümü / Bekliyor / Gecikti / Ödendi filtreleri vardır.
- Açık tutar, bu ay toplam, ödenen ve geciken özetleri gösterir.
- Ödeme kartından düzenleme ve `Ödendi Yap` işlemi yapılabilir.

Admin ödeme formu:

- Çocuk seçimi
- Dönem / ay / yıl seçimi
- Tutar
- Durum
- Son ödeme tarihi
- Ödeme tarihi
- Açıklama
- Bu ay / gelecek ay hızlı seçimleri

Firebase node:

```txt
odemeler/{paymentId}
  kresId
  cocukId
  childId
  veliId
  parentId
  veliIds
  parentIds
  baslik
  title
  aciklama
  ay
  yil
  donem
  tarih
  tutar
  amount
  durum: bekliyor | odendi | gecikti
  status
  sonOdemeTarihi
  odemeTarihi
  createdAt
  updatedAt
```

---

## Build Öncesi Test

```bash
npm install
npx expo-doctor
npx expo start --clear
```

RevenueCat eklendiği için build öncesi özellikle kontrol edilecekler:

```bash
npm install
npx expo-doctor
```

Test edilecek temel akış:

1. Admin giriş yapar.
2. Sınıf, öğretmen, veli ve çocuk bağlantıları kontrol edilir.
3. Öğretmen günlük rapor ve yoklama girer.
4. Öğretmen günlük rapor kaydedince başarı toastı görünür.
5. Öğretmen medikal bilgi alanını görüntüler/günceller.
6. Admin / öğretmen galeriye fotoğraf veya video yükler.
7. Veli galeri ekranında sadece kendi çocuğuna/sınıfına/kurumuna ait aktif kayıtları görür.
8. Admin ödeme kaydı oluşturur.
9. Veli ödeme ekranında son 12 ay ve tüm kayıtları görür.
10. Admin abonelik ekranında demo/promo/manual abonelik akışını kontrol eder.
11. RevenueCat ekranında ürün yokken güvenli uyarı geldiği kontrol edilir.
12. Ödeme, anket ve kurum zili ekranları açılır.
13. Veli özet ekranında günlük veriler görünür.
14. Tema değişimi veli / öğretmen ekranlarına yansır.
15. Admin / öğretmen / veli bildirim ekranları açılır.
16. Fiziksel cihazda push token ve push bildirim testi yapılır.
17. Giriş ekranından Kullanım Şartları, Gizlilik Politikası ve KVKK metni açılır.
18. Veli, öğretmen ve admin profil/ayar alanlarından yasal metinler açılır.

---

## Kalan Büyük İşler

- Google Play Console abonelik ürünlerini oluşturma
- RevenueCat Google Play service account bağlantısı
- RevenueCat ürünlerini gerçek Google Play ürünlerine bağlama
- Push notification gerçek cihaz uçtan uca testi
- Firebase Rules production güvenliği
- Cloud Functions ile 24 saatten eski galeri medyasını garantili silme
- Admin aylık yemek listesi ekranı
- A4/PDF yemek listesi ek dosya yükleme
- A4/PDF içinden otomatik menü çıkarma için sonraki faz OCR/AI değerlendirmesi
- Gerçek cihazda uçtan uca test
- Play Store kapalı test / üretim build süreci

---

## Geliştirici

Faruk Kurtuluş

---

## Durum

Yumurcak aktif geliştirme / MVP stabilizasyon aşamasındadır. Galeri hedefleme, ödeme takibi, veli günlük/aylık rapor ekranı, medikal bilgi akışı, yasal metinler, tema sistemi, admin ödeme modülü, RevenueCat kod altyapısı, uygulama içi bildirim merkezi, push notification altyapısı ve başarı toast sistemi eklenmiştir. Sıradaki kritik işler gerçek cihaz testleri, Google Play abonelik bağlantıları, Firebase Rules production güvenliği ve admin aylık yemek listesi modülüdür.
