# Yumurcak Kreş

Yumurcak Kreş; yönetici, öğretmen ve veli panelleri olan Expo / React Native tabanlı mobil kreş takip uygulamasıdır.

Proje çalışan MVP seviyesindedir. Build öncesi ana odak; gerçek cihaz testi, yasal metin bağlantıları, galeri akışı, ödeme entegrasyonu, bildirimler, RevenueCat ve Firebase güvenlik kurallarıdır.

## Roller

| Rol | Yetki |
| --- | --- |
| `superadmin` | Platform ve kreş yönetimi |
| `yonetici` | Kurum, sınıf, çocuk, öğretmen, veli, ödeme, anket, galeri, yasal metin ve istatistik yönetimi |
| `ogretmen` | Sınıf çocukları, yoklama, günlük rapor, mesaj, galeri paylaşımı ve yasal metin görüntüleme |
| `veli` | Çocuğa ait özet, rapor, ödeme, anket, mesaj, galeri ve yasal metin görüntüleme |

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
- Ödeme takibi
- Anket / oylama
- Mesajlaşma
- Galeri
- Uygulama içi yasal metinler: Kullanım Şartları, Gizlilik Politikası, KVKK Aydınlatma Metni

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
- Yönetici kurum bilgileri ekranı

Yasal metinlerde galeri içeriklerinin fotoğraf/video içerebileceği ve uygulama içinde 24 saat görünür olacak şekilde tasarlandığı belirtilmiştir. Fiziksel Storage temizliği için sonraki fazda Cloud Functions önerilir.

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
9. Giriş ekranından Kullanım Şartları, Gizlilik Politikası ve KVKK metni açılır.
10. Veli, öğretmen ve admin profil/ayar alanlarından yasal metinler açılır.

## Kalan Büyük İşler

- RevenueCat / abonelik ödeme entegrasyonu
- Push notification altyapısı
- Firebase Rules production güvenliği
- Cloud Functions ile 24 saatten eski galeri medyasını garantili silme
- Gerçek cihazda uçtan uca test
- Play Store kapalı test / üretim build süreci

## Geliştirici

Faruk Kurtuluş

## Durum

Yumurcak aktif geliştirme / MVP stabilizasyon aşamasındadır. Build öncesi galeri modülü, yasal metinler, admin istatistikleri ve profil/safe-area düzenlemeleri eklenmiştir. Sıradaki kritik işler ödeme entegrasyonu, bildirimler ve Firebase güvenlik kurallarıdır.
