# Yumurcak Kreş

Yumurcak Kreş; yönetici, öğretmen ve veli panelleri olan Expo / React Native tabanlı mobil kreş takip uygulamasıdır.

Proje artık çalışan MVP seviyesindedir. Build öncesi odak; gerçek cihaz testi, galeri akışı, ödeme entegrasyonu, bildirimler, RevenueCat ve Firebase güvenlik kurallarıdır.

## Roller

| Rol | Yetki |
| --- | --- |
| `superadmin` | Platform ve kreş yönetimi |
| `yonetici` | Kurum, sınıf, çocuk, öğretmen, veli, ödeme, anket, galeri ve istatistik yönetimi |
| `ogretmen` | Sınıf çocukları, yoklama, günlük rapor, mesaj, galeri paylaşımı |
| `veli` | Çocuğa ait özet, rapor, ödeme, anket, mesaj ve galeri görüntüleme |

## Güncel Modüller

- Rol bazlı giriş ve yönlendirme
- Firebase Realtime Database bağlantısı
- Firebase Storage profil fotoğrafı ve galeri altyapısı
- Kreş bazlı tema sistemi
- Veli alt tab yapısı
- Veli günlük özet ekranı
- Yönetici kurum istatistikleri
- Kurum Zili
- Ödeme takibi
- Anket / oylama
- Mesajlaşma
- Galeri

## Galeri Modülü

Galeri modülü `galeri/` node’u ve Firebase Storage ile çalışır.

Yapı:

```txt
galeri/{mediaId}
  kresId
  sinifId
  cocukIds
  hedef: kurum | sinif | cocuk
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
- Öğretmen kendi sınıfı veya seçili çocuk için fotoğraf / video yükleyebilir.
- Veli sadece kendi çocuğuna veya çocuğunun sınıfına ait aktif galeri kayıtlarını görür.
- Medyalar 24 saat sonra uygulamada görünmez.
- Yönetici / öğretmen galeri ekranı açıldığında süresi dolan kayıtlar temizlenmeye çalışılır.
- Storage’dan garantili otomatik silme için ileride Firebase Cloud Functions scheduled cleanup önerilir.

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
4. Admin / öğretmen galeriye fotoğraf veya video yükler.
5. Veli galeri ekranında sadece kendi çocuğuna ait aktif kayıtları görür.
6. Ödeme, anket ve kurum zili ekranları açılır.
7. Veli özet ekranında günlük veriler görünür.
8. Tema değişimi veli / öğretmen ekranlarına yansır.

## Kalan Büyük İşler

- RevenueCat / abonelik ödeme entegrasyonu
- Push notification altyapısı
- Firebase Rules production güvenliği
- Cloud Functions ile 24 saatten eski galeri medyasını garantili silme
- Gerçek cihazda uçtan uca test

## Geliştirici

Faruk Kurtuluş

## Durum

Yumurcak aktif geliştirme / MVP stabilizasyon aşamasındadır. Build öncesi galeri modülü eklenmiş, sıradaki kritik işler ödeme entegrasyonu ve bildirimlerdir.
