# Yumurcak Güncel Yol Haritası

Bu dosya build öncesi güncel durumu özetler.

## Tamamlananlar

- Expo / React Native temel yapı
- Firebase Realtime Database bağlantısı
- Firebase Storage profil fotoğrafı altyapısı
- Rol bazlı yönetici, öğretmen ve veli panelleri
- Veli alt tab yapısı
- Veli özet ekranı
- Kurum Zili
- Ödeme takibi
- Anket yönetimi
- Kurum istatistikleri
- Kreş bazlı tema sistemi
- Veli profil fotoğrafının anasayfa ve özet alanlarına yansıması
- Telefon alt safe-area ve tab bar düzeni

## Galeri Fazı

Galeri modülü build öncesi eklendi.

Yapılanlar:

- `src/screens/shared/GalleryScreenBase.js` ortak galeri altyapısı oluşturuldu.
- `src/screens/parent/ParentGalleryScreen.js` placeholder olmaktan çıkarıldı.
- `src/screens/admin/AdminGalleryScreen.js` eklendi.
- `src/screens/teacher/TeacherGalleryScreen.js` eklendi.
- Öğretmen navigation içine `TeacherGallery` route’u eklendi.
- Öğretmen paneline Galeri kartı eklendi.
- Yönetici navigation içine `AdminGallery` route’u eklendi.
- Galeri kayıtları `galeri/` node’una yazılır.
- Dosyalar Firebase Storage içinde `galeri/{kresId}/` altında tutulur.
- Her galeri kaydı `expiresAt` taşır ve 24 saat dolunca ekranda görünmez.

Veri modeli:

```txt
galeri/{mediaId}
  kresId
  sinifId
  cocukIds
  hedef
  type
  url
  storagePath
  aciklama
  yukleyenId
  yukleyenAd
  yukleyenRol
  createdAt
  expiresAt
```

## Build Öncesi Kalan Kritik İşler

1. Galeri ekranlarını gerçek cihazda test et.
2. Yönetici panelinde Galeri kartı görünmüyorsa `DashboardScreen.js` menüsüne `AdminGallery` kartı ekle.
3. RevenueCat ödeme / abonelik entegrasyonu.
4. Push notification entegrasyonu.
5. Firebase güvenlik kuralları.
6. Cloud Functions ile 24 saatten eski galeri dosyalarını garantili silme.
7. Android build ve kapalı test.

## Build Test Akışı

1. Admin giriş yapar.
2. Öğretmen giriş yapar.
3. Veli giriş yapar.
4. Öğretmen galeriye medya yükler.
5. Veli kendi çocuğuna ait galeri kaydını görür.
6. Yönetici galeri ekranında aktif kayıtları görür.
7. 24 saat süresi dolan kayıtlar ekranda görünmez.
8. Özet, anasayfa, gelişim, ödeme, anket ve kurum zili ekranları açılır.

## Sıradaki Fazlar

### FAZ 7 — Gerçek Cihaz Testi

Metro kırmızı hata vermeden ana akışlar çalışmalı.

### FAZ 8 — RevenueCat

Aylık / yıllık abonelik gerçek ödeme sistemine bağlanmalı.

### FAZ 9 — Bildirimler

Kurum Zili, mesaj, galeri ve ödeme hatırlatmaları için push notification eklenecek.

### FAZ 10 — Güvenlik

Realtime Database ve Storage rules üretim seviyesine getirilecek.

### FAZ 11 — Kapalı Test

Android build alınıp Play Console kapalı test yapılacak.
