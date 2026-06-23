# Yumurcak Güncel Yol Haritası

Bu dosya build öncesi güncel durumu kısa ve net şekilde özetler.

> Son güncelleme: 23 Haziran 2026

---

## 1. Güncel Genel Durum

Yumurcak Kreş, çalışan MVP + stabilizasyon aşamasındadır. Yönetici, öğretmen ve veli panellerindeki ana modüller büyük ölçüde tamamlandı. Şu an öncelik yeni özellik eklemekten çok gerçek cihaz testi, güvenlik, ödeme ve Play Store kapalı test hazırlığıdır.

---

## 2. Tamamlanan Ana Modüller

- Expo / React Native temel yapı
- Firebase Realtime Database bağlantısı
- Firebase Storage profil fotoğrafı ve galeri altyapısı
- Rol bazlı yönetici, öğretmen, veli ve superadmin panelleri
- Veli alt tab yapısı
- Veli özet ekranı
- Veli anasayfa pastel kart tasarımı
- Öğretmen anasayfa pastel kart tasarımı
- Veli profil fotoğrafının anasayfa ve özet alanlarına yansıması
- Kurum Zili
- Ödeme takibi
- Admin ödeme listesi ve ödeme formu
- Veli son 12 ay ödeme ekranı
- Anket yönetimi
- Kurum istatistikleri
- Hedefli duyuru sistemi
- Öğretmen sınıf duyurusu
- Öğretmen günlük rapor girişi
- Öğretmen yoklama girişi
- Öğretmen fiziksel gelişim girişi
- Veli gelişim / rapor ekranları
- Kreş genel tema sistemi
- Admin tema ekranı
- Öğretmen sınıf teması ekranı
- Sınıf tema kayıt altyapısı
- Admin / öğretmen / veli bildirim merkezi
- Expo push notification kod altyapısı
- Mesajlaşma
- Mesaj meta verisinde `undefined` temizleme
- Galeri modülü
- Yasal metinler
- Başarı toast sistemi
- Android navigation bar gizleme altyapısı
- RevenueCat kod altyapısı

---

## 3. Galeri Durumu

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
  targetType
  classId
  studentId
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

Kalan galeri işi:

- Cloud Functions ile 24 saatten eski Storage dosyalarını fiziksel olarak garantili silme.

---

## 4. Tema Durumu

Tamamlananlar:

- Kreş genel tema sistemi vardır.
- Yönetici tema seçebilir.
- Admin tema ekranı da tema arka planını kullanır.
- Veli / öğretmen anasayfa kartları pastel hale getirildi.
- Öğretmen sınıf teması seçme ekranı eklendi.
- Sınıf temaları şu path’e yazılır:

```txt
kresler/{kresId}/sinifTemalari/{sinifId}
```

Kontrol gereken nokta:

- Öğretmen / veli kullanıcı kayıtlarında `sinifId` alanı doluysa sınıf teması yayılır.
- `sinifId` boş gelen kullanıcılar için sonraki fazda RootNavigator sınıf tespit mantığı güçlendirilecek.

---

## 5. Build Öncesi Kalan Kritik İşler

1. Gerçek cihazda admin / öğretmen / veli uçtan uca test.
2. Mesaj gönderimi sonrası yanlış `Mesaj gönderilemedi` alerti çıkmadığını doğrulama.
3. Öğretmen sınıf temasının aynı sınıftaki veli ve öğretmenlere yansıdığını test etme.
4. Push token kaydı ve gerçek push bildirimi testi.
5. RevenueCat ürün yok / ürün var senaryoları.
6. Google Play subscription ürünleri.
7. RevenueCat service account bağlantısı.
8. RevenueCat package / entitlement eşlemesi.
9. Gerçek satın alma ve restore testi.
10. Firebase Realtime Database rules.
11. Firebase Storage rules.
12. Tema ve sınıf teması yazma yetki kuralları.
13. Android navigation bar davranışı gerçek cihaz testi.
14. Codemagic release build.
15. Play Store kapalı test.

---

## 6. Sıradaki Geliştirme Fazları

### FAZ 1 — Firebase Güvenlik Kuralları

Production öncesi en kritik iştir.

- `kresId` bazlı veri izolasyonu
- Yönetici / öğretmen / veli rol kontrolü
- Çocuk verisi erişim kısıtları
- Mesaj erişim kısıtları
- Bildirim erişim kısıtları
- Galeri Storage erişimi
- Tema / sınıf teması yazma yetkileri

### FAZ 2 — Admin Aylık Yemek Listesi

- Admin ay/yıl seçer.
- 30/31 günlük tablo açılır.
- Kahvaltı / öğle / ara öğün girilir.
- `Ayı Yayınla` ile günlük `yemekListeleri` kayıtları oluşturulur.
- Veli bugünün menüsünü mevcut ekrandan görür.

### FAZ 3 — Sınıf Teması Yayılım Kontrolü

- Öğretmen tema seçer.
- Aynı sınıftaki öğretmenler görür.
- O sınıftaki veliler görür.
- Başka sınıflar etkilenmez.
- Kullanıcı kaydında `sinifId` yoksa çocuk/sınıf verisinden tespit yapılır.

### FAZ 4 — RevenueCat / Google Play Gerçek Ödeme

- Google Play ürünleri oluşturulur.
- RevenueCat service account bağlanır.
- Ürünler RevenueCat package / entitlement ile eşlenir.
- Gerçek Android cihazda satın alma ve restore test edilir.

### FAZ 5 — Push Notification Gerçek Test

- Bildirim izni alınır.
- Expo push token kullanıcı kaydına yazılır.
- Admin / öğretmen / veli olaylarında push telefona düşer.

### FAZ 6 — Galeri Cloud Functions Temizliği

- 24 saatten eski galeri kayıtları silinir.
- Storage dosyaları fiziksel silinir.
- Hata loglama yapılır.

### FAZ 7 — Kapalı Test / Release

- Codemagic Android release build alınır.
- Android gerçek cihaz release testi yapılır.
- Play Console kapalı test açılır.
- Crash kontrolü yapılır.
- Veri güvenliği formu doldurulur.

---

## 7. Build Test Akışı

1. Admin giriş yapar.
2. Öğretmen giriş yapar.
3. Veli giriş yapar.
4. Admin sınıf / çocuk / öğretmen / veli bağlantılarını kontrol eder.
5. Öğretmen günlük rapor girer.
6. Öğretmen yoklama girer.
7. Öğretmen fiziksel gelişim girer.
8. Öğretmen sınıf teması seçer.
9. Veli aynı sınıf temasını görür.
10. Admin duyuru oluşturur.
11. Öğretmen sınıf duyurusu oluşturur.
12. Veli duyuruları doğru hedefe göre görür.
13. Admin ödeme kaydı oluşturur.
14. Veli ödeme ekranında kaydı görür.
15. Mesaj gönderilir ve yanlış hata alerti çıkmaz.
16. Galeriye fotoğraf/video yüklenir.
17. Veli doğru galeri kayıtlarını görür.
18. Bildirim merkezi açılır.
19. Push token oluşur.
20. Push bildirim telefona düşer.
21. Android navigation bar davranışı test edilir.
22. RevenueCat satın alma / restore denenir.

---

## 8. Notlar

- Kod tarafında ana modüller büyük ölçüde hazırdır.
- Production öncesi Firebase Rules şarttır.
- RevenueCat gerçek ödeme için Google Play bağlantısı şarttır.
- Push notification gerçek cihazda test edilmeden production hazır kabul edilmemelidir.
- Galeri içerikleri uygulamada 24 saat görünür; Storage’dan garantili silme için Cloud Functions gerekir.
- Admin aylık yemek listesi sonraki en büyük ürün geliştirme işidir.
