# Yumurcak Kreş

Yumurcak Kreş; kreş yöneticisi, öğretmen ve veli panelleri olan Expo / React Native tabanlı mobil kreş takip uygulamasıdır. Amaç; kreşteki günlük akışı, çocuk takibini, veli iletişimini, duyuru/anket süreçlerini, yemek, galeri, gelişim, ödeme, uyum, dökümanlar ve bildirim süreçlerini tek uygulamada toplamaktır.

Proje şu an **Google Play'de yayında**. Yönetici, öğretmen ve veli panellerindeki ana modüller tamamlanmış; push bildirimler Firebase Cloud Functions tarafına taşınmış; RevenueCat / Google Play abonelik akışı kurulmuş; galeri medya optimizasyonu eklenmiş; uyum, rozet, gelişim, sınıf ortalaması, dökümanlar/PDF sistemi ve bildirim kapsamı güncellenmiştir.

> Son güncelleme: 6 Ağustos 2026

---

## Güncel Durum

```txt
Durum: Google Play'de yayında
Ana modüller: Tamamlandı
Dökümanlar / PDF modülü: Tamamlandı (Faz 0-9)
Push bildirim: Firebase Cloud Functions ile aktif
Abonelik: RevenueCat + Google Play aktif
Pilot kullanım: Başladı
Kalan ana işler:
- App Store sürümü
- Kurum demoları
- İlk pilot kreşlerden geri bildirim toplama
- Yapay zeka destekli günlük özet metni (planlama aşamasında — bkz. ROADMAP.md Faz 21)
```

---

## Teknoloji

```txt
Expo SDK: 54
React Native: 0.81.5
React: 19.1.0
Firebase: 12.0.0
Firebase Auth: kullanıcı girişi ve rol ayrımı
Firebase Realtime Database: uygulama verileri (Firestore KULLANILMIYOR)
Firebase Storage: profil, galeri, yemek ve gelişim medya dosyaları
Firebase Cloud Functions: push bildirim, otomatik bildirim tetikleyicileri, etkinlik/yemek havuzu güncellemeleri
RevenueCat: react-native-purchases 9.0.0
Push: expo-notifications + Expo Push API
Medya seçimi: expo-image-picker
Fotoğraf optimizasyonu: expo-image-manipulator
Video optimizasyonu: react-native-compressor
Medya indirme / cihaz galerisine kaydetme: expo-file-system + expo-media-library
PDF / yazdırma: expo-print + expo-sharing
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
| `yonetici` | Kurum, sınıf, çocuk, öğretmen, veli, ödeme, duyuru, anket, galeri, tema, abonelik, bildirim, yasal metin, istatistik, dökümanlar ve çocuk uyum ayarı yönetimi |
| `ogretmen` | Kendi sınıfındaki çocuklar, yoklama, günlük rapor, medikal bilgi, fiziksel gelişim, uyum takibi, haftanın yıldızı rozeti, yemek listesi, ders programı, galeri, mesaj, duyuru, gezi formu, ilaç takip formu, tema ve bildirim ekranları |
| `veli` | Çocuğa ait özet, haftanın yıldızı rozeti, rozet albümü, günlük/aylık rapor, uyum skoru, sınıf ortalaması, ödeme, yemek, gelişim, medikal bilgi, anket, galeri, mesaj, bildirim, aylık bülten ve yasal metin ekranları |

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
- Öğretmen `Haftanın Yıldızı` rozet ekranı, veli özetinde haftalık rozet kartı, `Rozetlerim` ekranı, `Rozet Albümü`
- Veli gelişim ekranında `Aylık Gelişim` ve `Sınıf Ortalaması` tabları, anonim sınıf ortalaması karşılaştırması
- Yeni başlayan çocuklar için 30 günlük `Uyum Modülü`, veli `Uyum Skoru`, öğretmen günlük `Uyum Takibi`
- Admin çocuk formunda `Mevcut öğrenci / Yeni başlayan` ayrımı
- Öğretmen günlük rapor ekranı (ruh hali, öğün detayları, uyku süresi, tuvalet sayısı, öğretmen notu)
- Yoklama sistemi
- Galeri fotoğraf / video paylaşımı, uygulama içi görüntüleme/oynatma, cihaz galerisine kaydetme, yükleme öncesi medya optimizasyonu
- Medikal bilgi takibi ve ilaç takip formu (günlük uygulama log'u)
- Fiziksel gelişim kaydı ve geçmişi
- Duyuru sistemi (hedefli: kurum / veli / öğretmen / sınıf)
- Anket / oylama sistemi
- Mesajlaşma sistemi
- Kurum Zili
- Ödeme takibi
- Uygulama içi bildirim merkezi
- Firebase Cloud Functions tabanlı push notification sistemi
- RevenueCat abonelik altyapısı, Google Play abonelik ürünleri
- Uygulama içi yasal metinler
- Kullanıcıya görünen tarih formatlarında `DD.MM.YYYY` standardı
- **Dökümanlar / Aylık Belgeler modülü** (bkz. aşağıdaki bölüm)

---

## Dökümanlar / Aylık Belgeler Modülü

Eskiden yemek listesi ve ders programı hem A4 fotoğraf yükleyerek hem de ayrı ayrı elle giriliyordu. Bu modül **tek veri girişi → çoklu çıktı** mantığıyla yeniden kuruldu: öğretmen/yönetici bir ayı bir kez doldurur, sistem bunu hem yazdırılabilir/paylaşılabilir PDF'e hem de günlük özet kartlarına otomatik besler.

Ortak mimari:

```txt
Gün-bazlı belgeler (her gün ayrı kayıt): yemekListeleri, dersProgramlari, nobetCizelgeleri
Tek-kayıt / ay-bazlı bölümlü belgeler: aylikBultenler, personelGorevListeleri
Ay kavramı olmayan bağımsız belgeler: servisBilgileri, geziFormlari, ilacTakipFormlari
Hesaplanan rapor (elle girilmez): Doğum Günü Takvimi (cocuklar.dogumTarihi'nden)
```

Ortak özellikler (tüm belge türlerinde):

- Liste / Takvim görünüm toggle'ı (`MonthlyCalendarView`)
- Taslak doldur → `Ayı Yayınla` / `Yayından Kaldır`
- `Geçen Ayı Kopyala`
- Aylık/yayın bazlı `Arşiv` (`MonthlyArchivePicker`)
- Kurumsal PDF (logo, okul adı, telefon, adres, müdür imzası — `kresler/{kresId}`'den otomatik)
- Tek ekrandan Yazdır / Paylaş / İndir (`MonthlyDocumentPdfBar`, `expo-print` + `expo-sharing`)

Belge türleri:

| Belge | Ekran (Admin) | Kapsam |
| --- | --- | --- |
| Yemek Listesi | `AdminMonthlyMealScreen` | Sınıf bazlı, günlük |
| Ders Programı | `AdminMonthlyScheduleScreen` | Sınıf bazlı, günlük |
| Aylık Bülten | `AdminMonthlyBulletinScreen` | Kurum geneli, bölümlü |
| Nöbet Çizelgesi | `AdminMonthlyDutyRosterScreen` | Kurum geneli, günlük |
| Personel Görev Listesi | `AdminMonthlyStaffTasksScreen` | Kurum geneli, bölümlü |
| Servis Listesi | `AdminServiceScreen` | Çocuk bazlı, ay kavramı yok |
| Doğum Günü Takvimi | `AdminBirthdayCalendarScreen` | Hesaplanan, ay kavramı var |
| Gezi Formu | `AdminGeziFormListScreen` / `...EditScreen` | Bağımsız kayıtlar |
| İlaç Takip Formu | `TeacherMedicationForm...` (3 ekran) | Sağlık belgesi, öğretmen tarafında |

Öğretmen tarafında ders programı kendi sınıfına otomatik bağlanır (`TeacherScheduleScreen`), veli tarafında günlük özet ve aylık yemek/PDF ekranlarına otomatik akar.

### Etkinlik ve Yemek Kütüphanesi (kreşler arası anonim havuz)

- `etkinlikHavuzu` / `yemekHavuzu`: tüm kreşler arasında paylaşılan, **tamamen anonim** (okul/öğretmen/çocuk bilgisi içermez) kullanım istatistiği havuzu. Client sadece okuyabilir (`.write: false`), Cloud Functions (Admin SDK) günceller.
- `_etkinlikHavuzuMeta` / `_yemekHavuzuMeta`: farklı kreş sayısını hesaplamak için tamamen gizli node'lar (`.read: false`, `.write: false`).
- Öğretmen "Etkinlik Öner" / yazarken-öner (autocomplete) ile daha önce kullanılmış, popüler etkinlik ve yemekleri görüp tek dokunuşla seçebilir.
- Yaş grubu artık serbest metin değil, standart bir listeden seçiliyor (`YAS_GRUPLARI`).

---

## Push Bildirim Sistemi

Push bildirim gönderimi uygulama içinden çıkarılmış ve Firebase Cloud Functions tarafına taşınmıştır. Uygulama sadece `bildirimler` node'una kayıt oluşturur; Cloud Function hedef kullanıcıların Expo push tokenlarını bulur ve bildirimi telefona gönderir.

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
updateActivityPoolOnScheduleWrite
updateMealPoolOnMealWrite
```

Telefona push giden bildirimler:

```txt
✅ Duyuru          ✅ Galeri fotoğraf / video   ✅ Medikal bilgi
✅ Ödeme kaydı     ✅ Anket                     ✅ Fiziksel gelişim
✅ Mesaj           ✅ Haftanın Yıldızı / Rozet  ✅ Uyum takibi
✅ Kurum Zili      ✅ Yoklama
✅ Günlük rapor    ✅ Yemek listesi
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

## Firebase Ana Veri Yapıları

```txt
kullanicilar          duyurular            galeri
kresler                anketler             medikalBilgiler
siniflar               odemeler             fizikselGelisim
cocuklar               mesajlar             uyumKayitlari
gunlukRaporlar         bildirimler          haftaninRozetleri
yoklamalar              abonelikler

--- Dökümanlar modülü ---
yemekListeleri          nobetCizelgeleri     geziFormlari
dersProgramlari         personelGorevListeleri  ilacTakipFormlari
aylikBultenler          servisBilgileri

--- Etkinlik / Yemek kütüphanesi (anonim, kreşler arası) ---
etkinlikHavuzu          _etkinlikHavuzuMeta (gizli)
yemekHavuzu             _yemekHavuzuMeta (gizli)
```

---

## Sınıf Ortalaması Gizlilik Kuralı

Veli gelişim ekranında sınıf ortalaması sadece anonim ve toplu şekilde gösterilir.

```txt
Minimum 5 çocuk ölçümü şartı
Başka çocuk adı gösterilmez
Sıralama / derece yok
4/18, ilk %25, en iyi / en kötü ifadeleri yok
```

Yorum dili: `Ortalamaya yakın` / `Ortalamanın üzerinde` / `Ortalamanın altında`

---

## Cloud Functions Deploy

```bash
firebase deploy --only functions --project yumurcak-app
```

Dikkat:

```txt
Başka Firebase projesi aktif olsa bile --project yumurcak-app kullanılmalıdır.
Eski başka proje function'ları silinmemelidir.
```

---

## Tamamlanan Yayın Öncesi Testler

- ✅ Admin / Öğretmen / Veli girişi ve rol bazlı yönlendirme
- ✅ Günlük rapor, yoklama, fiziksel gelişim, uyum modülü akışları
- ✅ Haftanın Yıldızı / Rozet sistemi
- ✅ Galeri fotoğraf/video yükleme ve medya optimizasyonu
- ✅ Duyuru, anket, ödeme, kurum zili, mesajlaşma
- ✅ Push bildirimleri, Firebase Cloud Functions
- ✅ RevenueCat entegrasyonu, Google Play satın alma testi, Restore Purchase
- ✅ Firebase Database / Storage Rules
- ✅ Android Release Build, Google Play Production Yayını

---

## Not

Yumurcak Kreş şu anda Google Play üzerinde yayındadır. Yönetici, öğretmen ve veli panelleri aktif olarak çalışmaktadır. Kalan işler ve sıradaki geliştirmeler için **ROADMAP.md** dosyasına bakınız.
