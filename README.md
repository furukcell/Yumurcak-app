# Yumurcak Kreş

Yumurcak Kreş; kreş yöneticisi, öğretmen ve veli panelleri olan Expo / React Native tabanlı mobil kreş takip uygulamasıdır. Amaç; kreşteki günlük akışı, çocuk takibini, veli iletişimini, duyuru/anket süreçlerini, yemek, galeri, gelişim, ödeme, uyum ve bildirim süreçlerini tek uygulamada toplamaktır.

Proje şu an **canlı öncesi hazır / son gerçek cihaz kontrolü** seviyesindedir. Yönetici, öğretmen ve veli panellerindeki ana modüller tamamlanmış; push bildirimler Firebase Cloud Functions tarafına taşınmış; RevenueCat / Google Play abonelik akışı kurulmuş; galeri, uyum, rozet, gelişim, sınıf ortalaması ve bildirim kapsamı güncellenmiştir.

> Son güncelleme: 26 Haziran 2026

---

## Güncel Durum

```txt
Durum: Canlı öncesi hazır
Ana modüller: Tamamlandı
Push bildirim: Firebase Cloud Functions ile aktif
Abonelik: RevenueCat + Google Play ürünleri bağlı
Galeri: Uygulama içi görüntüleme, video oynatma ve cihaza kaydetme aktif
Uyum Modülü: Admin / öğretmen / veli tarafı aktif
Rozetlerim / Haftanın Yıldızı: Öğretmen verir, veli geçmişini görür
Sınıf Ortalaması: Veli gelişim ekranında anonim karşılaştırma aktif
Kalan ana iş: Gerçek cihaz son testleri ve Play kapalı test
```

---

## Teknoloji

```txt
Expo SDK: 54
React Native: 0.81.5
React: 19.1.0
Firebase: 12.0.0
Firebase Auth: kullanıcı girişi ve rol ayrımı
Firebase Realtime Database: uygulama verileri
Firebase Storage: profil, galeri, yemek ve gelişim medya dosyaları
Firebase Cloud Functions: push bildirim ve otomatik bildirim tetikleyicileri
RevenueCat: react-native-purchases 9.0.0
Push: expo-notifications + Expo Push API
Medya seçimi: expo-image-picker
Medya indirme / cihaz galerisine kaydetme: expo-file-system + expo-media-library
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
Firebase project: yumurcak-app
```

---

## Roller

| Rol | Açıklama |
| --- | --- |
| `superadmin` | Platform / kreş yönetimi ve üst seviye işlemler |
| `yonetici` | Kurum, sınıf, çocuk, öğretmen, veli, ödeme, duyuru, anket, galeri, tema, abonelik, bildirim, yasal metin, istatistik ve çocuk uyum ayarı yönetimi |
| `ogretmen` | Kendi sınıfındaki çocuklar, yoklama, günlük rapor, medikal bilgi, fiziksel gelişim, uyum takibi, haftanın yıldızı rozeti, yemek listesi, galeri, mesaj, duyuru, tema ve bildirim ekranları |
| `veli` | Çocuğa ait özet, haftanın yıldızı rozeti, rozet albümü, günlük/aylık rapor, uyum skoru, sınıf ortalaması, ödeme, yemek, gelişim, medikal bilgi, anket, galeri, mesaj, bildirim ve yasal metin ekranları |

---

## Tamamlanan Ana Özellikler

- Rol bazlı giriş ve otomatik yönlendirme
- Firebase Auth tabanlı kullanıcı akışı
- Realtime Database ile kurum, sınıf, çocuk, veli, öğretmen ve günlük takip verileri
- Firebase Storage ile profil fotoğrafı, galeri ve medya altyapısı
- Kreş ve sınıf bazlı tema sistemi
- Veli / öğretmen / admin panellerinde modern pastel kart tasarımları
- Veli özet ekranı
- Veli doğum günü kutlama modu
- Öğretmen doğum günleri ekranı
- Öğretmen `Haftanın Yıldızı` rozet ekranı
- Veli özet ekranında haftalık rozet kartı
- Veli ana sayfada `Rozetlerim` ekranı
- Veli gelişim ekranında `Rozet Albümü`
- Veli gelişim ekranında `Aylık Gelişim` ve `Sınıf Ortalaması` tabları
- Veli tarafında anonim sınıf ortalaması karşılaştırması
- Yeni başlayan çocuklar için 30 günlük `Uyum Modülü`
- Veli tarafında `Uyum Skoru`
- Öğretmen tarafında günlük `Uyum Takibi`
- Admin çocuk formunda `Mevcut öğrenci / Yeni başlayan` ayrımı
- Öğretmen günlük rapor ekranı
- Yoklama sistemi
- Yemek listesi ve aylık yemek listesi sistemi
- Galeri fotoğraf / video paylaşımı
- Galeri medya görüntüleme, uygulama içi video oynatma ve cihaz galerisine kaydetme
- Medikal bilgi takibi
- Fiziksel gelişim kaydı ve geçmişi
- Duyuru sistemi
- Anket / oylama sistemi
- Mesajlaşma sistemi
- Kurum Zili
- Ödeme takibi
- Uygulama içi bildirim merkezi
- Firebase Cloud Functions tabanlı push notification sistemi
- RevenueCat abonelik altyapısı
- Google Play abonelik ürünleri
- Uygulama içi yasal metinler
- Kullanıcıya görünen tarih formatlarında `DD.MM.YYYY` standardı

---

## Push Bildirim Sistemi

Push bildirim gönderimi uygulama içinden çıkarılmış ve Firebase Cloud Functions tarafına taşınmıştır. Uygulama sadece `bildirimler` node’una kayıt oluşturur; Cloud Function hedef kullanıcıların Expo push tokenlarını bulur ve bildirimi telefona gönderir.

Akış:

```txt
Uygulama / Admin / Öğretmen / Veli olayı
        ↓
Firebase Realtime Database kaydı
        ↓
Cloud Function otomatik tetiklenir
        ↓
bildirimler/{bildirimId} kaydı oluşur veya mevcut bildirim işlenir
        ↓
Expo Push API ile telefona push gider
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

Telefona push giden bildirimler:

```txt
✅ Duyuru
✅ Ödeme kaydı
✅ Mesaj
✅ Kurum Zili
✅ Günlük rapor
✅ Galeri fotoğraf / video
✅ Anket
✅ Haftanın Yıldızı / Rozet
✅ Yoklama
✅ Yemek listesi
✅ Medikal bilgi
✅ Fiziksel gelişim
✅ Uyum takibi
```

Bildirim durumları `bildirimler` kaydında izlenir:

```txt
pushStatus: pending | sent | no_tokens | error | skipped_empty_body
pushTokenCount
pushSentAt
pushProvider
pushError
```

---

## Abonelik / RevenueCat

RevenueCat ve Google Play abonelik altyapısı kurulmuştur. Admin panelinden paket seçimi yapılır. RevenueCat paketi okunamazsa ödeme yapmadan abonelik açılmaz; manuel aktif etme butonu canlı risk nedeniyle kaldırılmıştır.

Paketler:

| Paket | Öğrenci Aralığı | Aylık | Yıllık |
| --- | ---: | ---: | ---: |
| Başlangıç | 0-30 | 1.000 TL | 10.000 TL |
| Profesyonel | 31-50 | 1.500 TL | 15.000 TL |
| Kurum | 51-100 | 3.000 TL | 30.000 TL |
| 100+ | Özel teklif | Manuel | Manuel |

RevenueCat yapılandırması:

```txt
Offering: default
Entitlement: YUMURCAK Pro
Android public key: REVENUECAT_ANDROID_PUBLIC_KEY
```

Package eşleşmeleri:

```txt
baslangic_aylik
baslangic_yillik
profesyonel_aylik
profesyonel_yillik
kurum_aylik
kurum_yillik
```

Dahili demo promosyon kodu:

```txt
PILOT1AY
```

---

## Admin / Yönetici Paneli

Yönetici tarafında tamamlanan ana modüller:

- Dashboard / kurum özeti
- Sınıf yönetimi
- Çocuk yönetimi
- Öğretmen yönetimi
- Veli yönetimi
- Ödeme kayıtları
- Duyuru yönetimi
- Anket yönetimi
- Galeri yönetimi
- Aylık yemek listesi
- Tema yönetimi
- Abonelik ekranı
- Bildirim merkezi
- Yasal metinler
- Yeni başlayan çocuk için Uyum Modülü ayarı

Çocuk formunda uyum alanları:

```txt
yeniBaslayan
uyumTakibiAktif
uyumBaslangicTarihi
uyumSureGun
uyumDurumu
uyumTamamlanmaTarihi
sonUyumSkoru
```

---

## Öğretmen Paneli

Öğretmen tarafında tamamlanan ana modüller:

- Sınıf çocukları
- Yoklama
- Günlük rapor
- Fiziksel gelişim kaydı
- Medikal bilgi görüntüleme / takip
- Uyum Takibi
- Haftanın Yıldızı / rozet verme
- Sınıf galerisi
- Yemek listesi görüntüleme
- Mesajlaşma
- Duyurular
- Bildirim merkezi
- Sınıf teması

Haftanın Yıldızı mantığı:

```txt
haftaninRozetleri/{weekKey}_{cocukId}
```

Rozet sadece seçilen çocuğun velisinde görünür. Diğer çocukların velileri bu rozeti göremez.

---

## Veli Paneli

Veli paneli çocuğun günlük akışını tek yerde takip etmek için tasarlanmıştır.

Alt tab yapısı:

```txt
📊 Özet
🏠 Anasayfa
📋 Rapor
📈 Gelişim
💬 Mesaj
```

Veli tarafında tamamlanan ana modüller:

- Çocuk özeti
- Günlük durum kartları
- Raporlar
- Gelişim ekranı
- Aylık Gelişim
- Sınıf Ortalaması
- Rozet Albümü
- Rozetlerim
- Uyum Skoru
- Yoklama geçmişi
- Yemek listesi
- Galeri
- Medikal takip
- Ödeme ekranı
- Anketler
- Mesajlaşma
- Kurum Zili
- Bildirim merkezi
- Yasal metinler

---

## Sınıf Ortalaması Gizlilik Kuralı

Veli gelişim ekranında sınıf ortalaması sadece anonim ve toplu şekilde gösterilir.

Kurallar:

```txt
Minimum 5 çocuk ölçümü şartı
Başka çocuk adı gösterilmez
Sıralama / derece yok
4/18, ilk %25, en iyi / en kötü ifadeleri yok
```

Yorum dili:

```txt
Ortalamaya yakın
Ortalamanın üzerinde
Ortalamanın altında
```

---

## Galeri

Galeri modülü admin, öğretmen ve veli tarafında ortak altyapıyla çalışır.

Özellikler:

- Tek fotoğraf yükleme
- Çoklu fotoğraf yükleme
- Video yükleme
- 24 saat aktif görünürlük
- Uygulama içi fotoğraf görüntüleme
- Uygulama içi video oynatma
- Cihaza kaydetme butonu
- `Yumurcak` albümüne kaydetme
- 1, 3 ve 4+ medya için düzenli grid tasarımı

Veri yolu:

```txt
galeri/{galleryId}
```

Storage yolu:

```txt
galeri/{kresId}/{galleryId}/...
```

---

## Firebase Ana Veri Yapıları

```txt
kullanicilar
kresler
siniflar
cocuklar
duyurular
anketler
odemeler
mesajlar
bildirimler
gunlukRaporlar
yoklamalar
yemekListeleri
galeri
medikalBilgiler
fizikselGelisim
uyumKayitlari
haftaninRozetleri
abonelikler
```

---

## Cloud Functions Deploy

Doğru Firebase projesi:

```txt
yumurcak-app
```

Deploy komutu:

```bash
firebase deploy --only functions --project yumurcak-app
```

Dikkat:

```txt
Başka Firebase projesi aktif olsa bile --project yumurcak-app kullanılmalıdır.
Eski başka proje function'ları silinmemelidir.
```

---

## Son Test Listesi

Canlı öncesi yapılacak son kontrol listesi:

1. Admin girişi
2. Öğretmen girişi
3. Veli girişi
4. Admin sınıf / çocuk / öğretmen / veli bağlantıları
5. Öğretmen günlük rapor girer
6. Günlük rapor bildirimi veliye düşer
7. Öğretmen yoklama girer
8. Yoklama bildirimi veliye düşer
9. Öğretmen fiziksel gelişim girer
10. Gelişim bildirimi veliye düşer
11. Öğretmen uyum kaydı girer
12. Uyum bildirimi veliye düşer
13. Öğretmen rozet verir
14. Rozet bildirimi veliye düşer
15. Galeriye fotoğraf/video yüklenir
16. Galeri bildirimi veliye düşer
17. Admin duyuru oluşturur
18. Duyuru bildirimi hedef kullanıcıya düşer
19. Admin anket oluşturur
20. Anket bildirimi veliye düşer
21. Admin ödeme kaydı oluşturur
22. Ödeme bildirimi veliye düşer
23. Veli Kurum Zili gönderir
24. Kurum Zili bildirimi admin/öğretmene düşer
25. Mesaj gönderilir
26. Mesaj bildirimi karşı tarafa düşer
27. Bildirim kaydında `pushStatus: sent` kontrol edilir
28. RevenueCat ürünleri gerçek cihazda görünür
29. Google Play satın alma popup'ı açılır
30. Restore testi yapılır
31. Firebase Database Rules son kontrol edilir
32. Firebase Storage Rules son kontrol edilir
33. Android release build alınır
34. Play Console kapalı test başlatılır

---

## Kalan İşler

Canlıya engel ana geliştirme işi kalmamıştır. Kalanlar son kontrol ve opsiyonel geliştirmelerdir.

### Zorunlu Son Kontroller

```txt
- Gerçek cihaz push testi
- RevenueCat / Google Play satın alma testi
- Restore testi
- Firebase Realtime Database rules kontrolü
- Firebase Storage rules kontrolü
- Kapalı test build kontrolü
```

### Opsiyonel Sonraki Fazlar

```txt
- Abonelik bitiş uyarısı için zamanlı Cloud Function
- Doğum günü bildirimi için zamanlı Cloud Function
- 24 saat dolan galeri Storage dosyaları için otomatik temizlik Function'ı
- Admin raporlama / kullanım analitiği
- Web tanıtım sayfası
```

---

## Not

Yumurcak şu an özellik kapsamı bakımından canlı pilot / kapalı test için hazır seviyededir. Bundan sonraki ana karar; gerçek cihaz testleri, kapalı test kullanıcıları ve ilk pilot kreş kullanım sürecidir.
