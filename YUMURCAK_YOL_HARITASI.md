# Yumurcak Güncel Yol Haritası

Bu dosya Yumurcak Kreş uygulamasının güncel canlı öncesi durumunu özetler.

> Son güncelleme: 26 Haziran 2026

---

## 1. Güncel Genel Durum

Yumurcak Kreş şu an **canlı öncesi hazır / son gerçek cihaz kontrolü** seviyesindedir. Yönetici, öğretmen ve veli tarafındaki ana modüller tamamlandı. Push notification sistemi Firebase Cloud Functions tarafına taşındı ve uygulamadaki ana olayların büyük çoğunluğu telefona push bildirim üretecek hale getirildi.

Yeni özellik geliştirme tarafında canlıyı engelleyen ana iş kalmamıştır. Kalan işler; gerçek cihaz son testleri, Firebase Rules son kontrolü, RevenueCat / Google Play satın alma doğrulaması ve Play Console kapalı test sürecidir.

---

## 2. Tamamlanan Ana Modüller

```txt
✅ Expo / React Native temel yapı
✅ Firebase Auth rol bazlı giriş
✅ Firebase Realtime Database bağlantısı
✅ Firebase Storage profil / galeri / medya altyapısı
✅ Yönetici paneli
✅ Öğretmen paneli
✅ Veli paneli
✅ Superadmin paneli
✅ Kurum / sınıf / çocuk / öğretmen / veli yönetimi
✅ Veli özet ekranı
✅ Veli anasayfa
✅ Öğretmen anasayfa
✅ Admin dashboard
✅ Ödeme takibi
✅ Admin ödeme listesi ve ödeme formu
✅ Veli ödeme ekranı
✅ Duyuru sistemi
✅ Anket yönetimi
✅ Mesajlaşma
✅ Kurum Zili
✅ Günlük rapor
✅ Yoklama
✅ Yemek listesi
✅ Admin aylık yemek listesi
✅ Galeri fotoğraf / video
✅ Galeri uygulama içi görüntüleme
✅ Galeri video oynatma
✅ Galeri cihaz galerisine kaydetme
✅ Medikal bilgi takibi
✅ Fiziksel gelişim kaydı
✅ Veli gelişim ekranı
✅ Aylık Gelişim
✅ Sınıf Ortalaması
✅ Rozet Albümü
✅ Haftanın Yıldızı
✅ Veli Rozetlerim ekranı
✅ Uyum Modülü
✅ Öğretmen Uyum Takibi
✅ Veli Uyum Skoru
✅ Tema sistemi
✅ Sınıf tema sistemi
✅ Bildirim merkezi
✅ Cloud Functions push notification sistemi
✅ RevenueCat abonelik altyapısı
✅ Google Play abonelik ürün eşleşmeleri
✅ Yasal metinler
✅ Başarı toast sistemi
✅ Android navigation bar ayarları
```

---

## 3. Push Bildirim Durumu

Push notification sistemi artık sadece uygulama açıkken değil, uygulama kapalıyken de telefona bildirim gönderecek backend mimarisine taşındı.

Akış:

```txt
Olay oluşur
  ↓
Firebase node'una kayıt düşer
  ↓
Cloud Function tetiklenir
  ↓
bildirimler node'una bildirim kaydı yazılır
  ↓
sendPushOnNotificationCreate çalışır
  ↓
Expo Push API ile telefona bildirim gider
```

Aktif Cloud Functions:

```txt
sendPushOnNotificationCreate
createNotificationOnDailyReportCreate
createNotificationOnGalleryCreate
createNotificationOnPollCreate
createNotificationOnWeeklyBadgeWrite
createNotificationOnAttendanceWrite
createNotificationOnMealListCreate
createNotificationOnMedicalWrite
createNotificationOnPhysicalDevelopmentCreate
createNotificationOnAdaptationWrite
```

Telefona push giden olaylar:

```txt
✅ Duyuru
✅ Ödeme kaydı
✅ Mesaj
✅ Kurum Zili
✅ Günlük Rapor
✅ Galeri Foto/Video
✅ Anket
✅ Haftanın Yıldızı / Rozet
✅ Yoklama
✅ Yemek Listesi
✅ Medikal Bilgi
✅ Fiziksel Gelişim
✅ Uyum Takibi
```

Bildirim kayıtlarında kontrol edilecek durumlar:

```txt
pushStatus: pending
pushStatus: sent
pushStatus: no_tokens
pushStatus: error
pushStatus: skipped_empty_body
```

---

## 4. RevenueCat / Google Play Durumu

Abonelik altyapısı canlı güvenli akışa göre düzenlendi.

Tamamlananlar:

```txt
✅ RevenueCat proje ayarı
✅ Android public key
✅ Offering: default
✅ Entitlement: YUMURCAK Pro
✅ Google Play abonelik ürünleri
✅ RevenueCat package eşleşmeleri
✅ Admin abonelik ekranı
✅ Paket okunamadığında manuel aktif etme kaldırıldı
✅ PILOT1AY demo promosyon kodu bırakıldı
```

Paketler:

```txt
Başlangıç: 0-30 öğrenci / 1.000 TL aylık / 10.000 TL yıllık
Profesyonel: 31-50 öğrenci / 1.500 TL aylık / 15.000 TL yıllık
Kurum: 51-100 öğrenci / 3.000 TL aylık / 30.000 TL yıllık
100+: özel teklif
```

Kalan kontrol:

```txt
- Gerçek Android cihazda Google Play ödeme popup'ı
- Başarılı satın alma sonrası entitlement kontrolü
- Restore testi
- Firebase abonelik kaydı kontrolü
```

---

## 5. Galeri Durumu

Galeri modülü tamamlandı.

Yapılanlar:

```txt
✅ Ortak GalleryScreenBase altyapısı
✅ Veli galeri ekranı
✅ Öğretmen galeri ekranı
✅ Admin galeri ekranı
✅ Fotoğraf yükleme
✅ Çoklu fotoğraf yükleme
✅ Video yükleme
✅ 24 saat aktif görünürlük
✅ Fotoğraf tıklayınca uygulama içi görüntüleme
✅ Video uygulama içinde oynatma
✅ Kaydet butonu
✅ Cihaz galerisine Yumurcak albümü altında kaydetme
✅ Çoklu medya grid tasarımı
✅ Galeri push bildirimi
```

Opsiyonel sonraki iş:

```txt
- 24 saatten eski Storage dosyalarını fiziksel silen zamanlı Cloud Function
```

---

## 6. Uyum Modülü Durumu

Uyum Modülü tamamlandı.

Tamamlananlar:

```txt
✅ Admin çocuk formunda Mevcut öğrenci / Yeni başlayan seçimi
✅ Yeni başlayan çocuk için 30 günlük takip
✅ Öğretmen Uyum Takibi ekranı
✅ Günlük uyum kaydı
✅ Otomatik uyum skoru
✅ Aynı gün kayıt varsa formun eski veriyle dolması
✅ 30 gün sonunda aktif takibin kapanması
✅ Veli Uyum Skoru ekranı
✅ İlk kayıt yoksa 0/100 yerine Skor Bekleniyor gösterimi
✅ Veli anasayfada sadece uyum çocuğunda Uyum Skoru kartı
✅ Uyum takibi push bildirimi
```

---

## 7. Gelişim / Sınıf Ortalaması Durumu

Tamamlandı.

```txt
✅ Öğretmen fiziksel gelişim kaydı
✅ Veli aylık gelişim ekranı
✅ Veli Sınıf Ortalaması tabı
✅ Minimum 5 çocuk ölçümü şartı
✅ Anonim karşılaştırma
✅ Başka çocuk adı göstermeme
✅ Sıralama / derece göstermeme
✅ Fiziksel gelişim push bildirimi
```

Kullanılan yorum dili:

```txt
Ortalamaya yakın
Ortalamanın üzerinde
Ortalamanın altında
```

---

## 8. Haftanın Yıldızı / Rozet Durumu

Tamamlandı.

```txt
✅ Öğretmen Haftanın Yıldızı ekranı
✅ Cuma günü rozet verme mantığı
✅ Aynı hafta aynı çocuk için kayıt güncelleme
✅ haftaninRozetleri veri yapısı
✅ Veli özet ekranında haftalık rozet kartı
✅ Veli Rozetlerim ekranı
✅ Veli rozet geçmişi
✅ Sadece ilgili çocuğun velisinin görmesi
✅ Rozet push bildirimi
```

---

## 9. Tema Durumu

Tamamlandı / test edilecek.

```txt
✅ Kreş genel tema sistemi
✅ Yönetici tema seçimi
✅ Admin tema ekranı
✅ Veli / öğretmen pastel kart tasarımları
✅ Öğretmen sınıf teması ekranı
✅ Sınıf tema kayıt altyapısı
```

Son kontrol:

```txt
- Öğretmen / veli kullanıcı kayıtlarında sinifId doluysa sınıf teması doğru yayılıyor mu?
- sinifId boş kullanıcılar için çocuk/sınıf ilişkisinden görünüm doğru mu?
```

---

## 10. Canlı Öncesi Son Test Akışı

```txt
1. Admin giriş yapar
2. Öğretmen giriş yapar
3. Veli giriş yapar
4. Admin sınıf / çocuk / öğretmen / veli bağlantılarını kontrol eder
5. Öğretmen günlük rapor girer
6. Veli günlük raporu görür ve push alır
7. Öğretmen yoklama girer
8. Veli yoklama ekranını görür ve push alır
9. Öğretmen fiziksel gelişim girer
10. Veli gelişim kaydını görür ve push alır
11. Öğretmen uyum kaydı girer
12. Veli Uyum Skoru ekranını görür ve push alır
13. Öğretmen rozet verir
14. Veli Rozetlerim ekranında görür ve push alır
15. Admin / öğretmen galeriye medya yükler
16. Veli galeride görür ve push alır
17. Veli fotoğraf/video açar
18. Veli medyayı cihaza kaydeder
19. Admin duyuru oluşturur
20. Hedef kullanıcı push alır
21. Admin anket oluşturur
22. Veli anketi görür ve push alır
23. Admin ödeme kaydı oluşturur
24. Veli ödeme ekranında görür ve push alır
25. Veli Kurum Zili gönderir
26. Admin / öğretmen push alır
27. Mesaj gönderilir
28. Karşı taraf push alır
29. Bildirimler ekranında kayıtlar görünür
30. Firebase'de pushStatus: sent kontrol edilir
31. RevenueCat paketleri gerçek cihazda görünür
32. Google Play ödeme popup'ı açılır
33. Satın alma sonrası abonelik aktif olur
34. Restore testi yapılır
35. Firebase Database Rules kontrol edilir
36. Firebase Storage Rules kontrol edilir
37. Android release build alınır
38. Play Console kapalı test başlatılır
```

---

## 11. Kalan İşler

Canlıya engel ana geliştirme işi kalmadı. Kalanlar son kontrol ve opsiyonel geliştirmelerdir.

### Zorunlu Son Kontroller

```txt
⏳ Gerçek cihaz push testi
⏳ RevenueCat / Google Play gerçek satın alma testi
⏳ Restore testi
⏳ Firebase Realtime Database rules son kontrolü
⏳ Firebase Storage rules son kontrolü
⏳ Android release build testi
⏳ Play Console kapalı test
```

### Opsiyonel Sonraki Fazlar

```txt
- Abonelik bitiş uyarısı için zamanlı Cloud Function
- Doğum günü bildirimi için zamanlı Cloud Function
- Galeri Storage otomatik temizlik Function'ı
- Admin raporlama / kullanım analitiği
- Landing page / web tanıtım sayfası
- Pilot kreş onboarding dökümanı
```

---

## 12. Canlıya Hazırlık Notu

Yumurcak şu an ürün kapsamı olarak canlı pilot / kapalı test için hazır kabul edilebilir. Bundan sonraki asıl iş yeni özellik eklemek değil; gerçek cihazda uçtan uca test, kapalı test kullanıcıları, Firebase rules güvenliği ve ilk pilot kreş kullanım sürecidir.

Özet:

```txt
Kod tarafı: Ana modüller tamamlandı
Bildirim tarafı: Cloud Functions ile tamamlandı
Abonelik tarafı: Kuruldu, gerçek cihaz testi kaldı
Play tarafı: Kapalı test hazırlığı kaldı
Canlı engeli: Kritik özellik eksiği yok
```
