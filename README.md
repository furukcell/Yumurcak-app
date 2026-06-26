# Yumurcak Kreş

Yumurcak Kreş; kreş yöneticisi, öğretmen ve veli panelleri olan Expo / React Native tabanlı mobil kreş takip uygulamasıdır. Amaç; kreşteki günlük akışı, çocuk takibini, veli iletişimini, duyuru/anket süreçlerini, yemek, galeri, gelişim ve uyum takibini tek uygulamada toplamaktır.

Proje şu an çalışan MVP + stabilizasyon seviyesindedir. Ana admin, öğretmen ve veli modülleri büyük ölçüde tamamlanmıştır. Güncel odak; gerçek cihaz build testi, Firebase Realtime Database / Storage rules doğrulaması, RevenueCat / Google Play abonelik bağlantısı, push notification fiziksel cihaz testi ve kapalı test hazırlığıdır.

> Son güncelleme: 26 Haziran 2026

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
RevenueCat: react-native-purchases 9.0.0
Push: expo-notifications
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

## Öne Çıkan Özellikler

- Rol bazlı giriş ve otomatik yönlendirme
- Firebase Auth tabanlı kullanıcı akışı
- Realtime Database ile kurum, sınıf, çocuk, veli, öğretmen ve günlük takip verileri
- Firebase Storage ile profil fotoğrafı, galeri ve yemek fotoğrafı/video altyapısı
- Kreş ve sınıf bazlı tema sistemi
- Veli / öğretmen / admin panellerinde modern pastel kart tasarımları
- Veli özet ekranı
- Veli doğum günü kutlama modu
- Öğretmen doğum günleri ekranı
- Öğretmen `Haftanın Yıldızı` rozet ekranı
- Veli özet ekranında haftalık rozet kartı
- Veli gelişim ekranında `Rozet Albümü`
- Veli gelişim ekranında `Aylık Gelişim` ve `Sınıf Ortalaması` tabları
- Veli tarafında anonim sınıf ortalaması karşılaştırması
- Yeni başlayan çocuklar için 30 günlük `Uyum Modülü`
- Veli tarafında `Uyum Skoru`
- Öğretmen tarafında günlük `Uyum Takibi`
- Admin çocuk formunda `Mevcut öğrenci / Yeni başlayan` ayrımı
- Öğretmen günlük rapor ekranı
- Yoklama sistemi
- Yemek listesi ve öğün fotoğrafı sistemi
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
- Expo push notification altyapısı
- RevenueCat abonelik altyapısı
- Uygulama içi yasal metinler
- Kullanıcıya görünen tarih formatlarında `DD.MM.YYYY` standardı

---

## Son Güncellemeler

### 26 Haziran 2026

#### Uyum Modülü

- Admin çocuk ekleme/düzenleme formuna `Uyum Modülü` ayarı eklendi.
- Çocuk kaydında `Mevcut öğrenci` ve `Yeni başlayan` ayrımı yapılır.
- Yeni başlayan seçilirse 30 günlük uyum takibi açılır.
- Çocuk kaydına şu alanlar yazılır:

```txt
yeniBaslayan
uyumTakibiAktif
uyumBaslangicTarihi
uyumSureGun
uyumDurumu
uyumTamamlanmaTarihi
sonUyumSkoru
```

- Öğretmen paneline `Uyum Modülü` kartı eklendi.
- Öğretmen sadece `uyumTakibiAktif == true` olan çocukları günlük uyum listesinde görür.
- Öğretmen günlük olarak sabah durumu, ağlama süresi, yemek, çıkış, uyku, arkadaşlarla oyun, dönüm noktaları ve not girebilir.
- Kayıt kaydedildiğinde otomatik `0-100` arası uyum skoru hesaplanır.
- Aynı gün tekrar açılan kayıt formu eski kayıtla otomatik dolar; böylece kayıt yanlışlıkla default değerlerle ezilmez.
- 30 gün sonunda aktif takip kapanır, kayıtlar silinmez.
- Veli tarafında aktif süreç `Uyum Skoru`, tamamlanan süreç ise geçmiş uyum raporu olarak görüntülenir.
- Veli ekranında ilk öğretmen kaydı yoksa `0/100` gösterilmez; `Skor Bekleniyor` durumu gösterilir.
- Veli ana ekranda `Uyum Skoru` kartı sadece uyum takibi olan çocuklarda görünür.

#### Veli Gelişim / Sınıf Ortalaması

- Veli `Gelişim` ekranına iki tab eklendi:

```txt
Aylık Gelişim
Sınıf Ortalaması
```

- Eski aylık gelişim ekranı `Aylık Gelişim` tabında korunur.
- `Sınıf Ortalaması` tabı sadece veli tarafındadır; admin ve öğretmen tarafına yeni ekran eklenmemiştir.
- Sınıf ortalaması `fizikselGelisim` kayıtlarından hesaplanır.
- Aynı sınıf + aynı ay + her çocuk için son ölçüm mantığı kullanılır.
- Boy, kilo ve varsa baş çevresi karşılaştırılır.
- Başka çocukların adı veya tekil verisi gösterilmez.
- Gizlilik için minimum `5 çocuk ölçümü` şartı eklendi.
- Minimum veri yoksa ortalama gösterilmez ve açıklayıcı anonimlik uyarısı çıkar.
- Sıralama, derece, `4/18`, `ilk %25`, `en iyi/en kötü` gibi rekabet oluşturabilecek ifadeler kullanılmaz.
- Yorum dili yumuşak tutulur:

```txt
Ortalamaya yakın
Ortalamanın üzerinde
Ortalamanın altında
```

- Bilgilendirme kartında her çocuğun gelişiminin kendine özel olduğu belirtilir.

#### Galeri İyileştirmeleri

- Ortak galeri altyapısı üzerinden veli, öğretmen ve admin tarafında medya görüntüleme desteklenir.
- Fotoğrafa tıklayınca uygulama içinde görüntüleyici açılır.
- Video uygulama içinde oynatılır; telefon tarayıcısına yönlendirme hedeflenmez.
- Galeri görüntüleyiciye `Kaydet` butonu eklendi.
- Medya cihaz galerisine `Yumurcak` albümü altında kaydedilir.
- Çoklu medya tasarımı 1, 3 ve 4+ medya durumlarına göre grid/overlay mantığıyla düzenlenir.

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

### Veli Özet Ekranı

Özet ekranında veli, çocuğun güncel durumunu hızlıca görür.

Gösterilen bilgiler:

- Çocuk kartı
- Veli profil fotoğrafı / avatar
- Kreş adı ve günün tarihi
- Günlük durum özeti
- Giriş saati / yoklama bilgisi
- Ruh hali
- Uyku bilgisi
- Etkinlik sayısı
- Günlük kısa yorum
- Yemek ve menü özeti
- Ders ve etkinlik programı
- Bekleyen ödeme hatırlatması
- Cevap bekleyen anket hatırlatması
- Mesaj kısayolu
- Gelişim ekranı kısayolu
- En altta `Haftanın Yıldızı` kartı
- Uyum takibi olan çocuklarda `Uyum Skoru` kartı

### Veli Doğum Günü Modu

Çocuğun doğum günü geldiğinde sadece veli özet ekranında özel kutlama modu çalışır.

Mantık:

```txt
selectedChild.dogumTarihi gün/ay == bugünün gün/ay değeri
```

Aktif olduğunda:

- Üst bölümde `🎂 Bugün doğum günü var` rozeti çıkar.
- Çocuk kartında özel doğum günü mesajı görünür.
- Rengarenk balonlar sürekli aşağıdan yukarı hareket eder.
- Konfetiler sürekli ekranda süzülür.
- Popup aynı gün sadece bir kez gösterilir.
- Popup durumu AsyncStorage ile saklanır.
- Efektler ekran kullanımını engellemez.

AsyncStorage anahtarı:

```txt
birthdayPopupSeen_{childId}_{YYYY-MM-DD}
```

### Veli Haftanın Yıldızı Kartı

Özet ekranının en altında haftalık rozet kartı görünür.

Mantık:

```txt
haftaninRozetleri içinde:
  cocukId == selectedChild.id
  weekKey == mevcut hafta başlangıcı
  aktif != false
```

Önemli davranış:

- Bu hafta rozet yoksa kart hiç görünmez.
- Kart sadece kendi çocuğunun velisinde görünür.
- Diğer çocukların velileri bu rozeti kendi ekranında göremez.

### Veli Gelişim Ekranı

Veli gelişim ekranı artık tablı yapıdadır.

```txt
📅 Aylık Gelişim
📊 Sınıf Ortalaması
```

#### Aylık Gelişim

Aylık gelişim tabı çocuğun seçili ay içindeki genel durumunu gösterir.

Gösterilen bilgiler:

- Aylık gelişim yorumu
- Geldiği gün
- Devamsızlık
- Olumlu ruh hali sayısı
- Etkinlik sayısı
- Katılım durumu
- Ruh hali dağılımı
- Ortalama uyku
- Yemek durumu
- Fiziksel gelişim özeti
- Boy/kilo geçmiş grafiği
- Son ölçümler
- Rozet Albümü

#### Rozet Albümü

Veli gelişim ekranında `🎖️ Rozet Albümü` alanı bulunur.

Özellikler:

- Çocuğun geçmiş haftalık rozetlerini listeler.
- Sadece seçili çocuğun kayıtları görünür.
- Rozet emojisi, rozet adı, hafta aralığı ve öğretmen notu gösterilir.
- Kayıt yoksa açıklayıcı boş durum metni görünür.

#### Sınıf Ortalaması

Sınıf Ortalaması tabı velinin kendi çocuğunun fiziksel ölçümünü anonim sınıf ortalamasıyla karşılaştırır.

Gösterilen bilgiler:

- Mor anonimlik kartı
- Seçili çocuk adı ve seçili ay
- Anonim veri sayısı
- Boy karşılaştırması
- Kilo karşılaştırması
- Baş çevresi karşılaştırması, veri varsa
- Bilgilendirme kartı
- Veri sayısı kartı

Gizlilik kuralları:

```txt
Minimum çocuk ölçümü: 5
Başka çocuk adı: gösterilmez
Tekil çocuk verisi: gösterilmez
Sıralama: gösterilmez
```

Yetersiz veri durumunda:

```txt
Anonim veri için yeterli kayıt yok
```

mesajı gösterilir.

### Veli Uyum Skoru

Uyum Skoru sadece yeni başlayan veya uyum geçmişi bulunan çocuklarda görünür.

Aktif süreçte gösterilenler:

- Gün sayacı
- 30 günlük ilerleme
- Uyum skoru
- Emoji geçmişi
- Bugünün özeti
- Öğretmen notu
- Ağlama trendi
- Dönüm noktaları
- Kalan gün kartı

İlk öğretmen kaydı yoksa:

```txt
Skor Bekleniyor
İlk öğretmen kaydı bekleniyor
```

30 gün sonunda:

- Aktif takip kapanır.
- Kayıtlar silinmez.
- Veli geçmiş uyum raporunu görmeye devam eder.

### Veli Yemek Ekranı

- Bugünün yemekleri gösterilir.
- Kahvaltı, öğle ve ara öğün ayrı ayrı listelenir.
- Öğretmen fotoğraf eklediyse veli fotoğrafı görür.
- Aylık menü ve öğretmen günlük bildirimi birlikte desteklenir.
- Son 7 günlük yemek kayıtları görüntülenebilir.

### Veli Anket Ekranı

- Aktif kurum/sınıf anketleri görünür.
- Seçenek kartlarına basarak cevap verilir.
- Cevap kaydedildikten sonra `Cevabı değiştir` butonu ile yeni cevap seçilebilir.
- Seçili cevap görsel olarak vurgulanır.

### Veli Galeri Ekranı

- Fotoğraf ve video paylaşımları gösterilir.
- Fotoğrafa basınca uygulama içi görüntüleyici açılır.
- Video uygulama içinde oynatılır.
- Kaydet butonu ile medya cihaz galerisine kaydedilebilir.
- Çoklu medya kartları grid yapısında gösterilir.
- 24 saatlik görünürlük mantığı desteklenir.

---

## Öğretmen Paneli

Öğretmen paneli sınıf bazlı günlük akışı yönetmek için tasarlanmıştır.

Başlıca ekranlar:

- Çocuklarım
- Günlük Rapor
- Yoklama
- Uyum Modülü
- Fiziksel Gelişim
- Haftanın Yıldızı
- Doğum Günleri
- Yemek Listesi
- Galeri
- Medikal
- Duyurular
- Mesajlar
- Tema Ayarları
- Profil

### Öğretmen Uyum Takibi

Uyum Takibi ekranı sadece aktif uyum sürecindeki çocukları listeler.

Filtre mantığı:

```txt
uyumTakibiAktif == true
uyumDurumu == aktif
sinifId == öğretmenin sınıfı
```

Günlük form alanları:

- Sabah nasıldı?
- Ağladı mı? Kaç dakika?
- Öğle yemeği
- Akşam çıkışı
- Uyku süresi
- Arkadaşlarla oyun
- Dönüm noktaları
- Öğretmen notu

Skor hesabı:

```txt
Sabah durumu: 0-20 puan
Ağlama süresi: 0-20 puan
Yemek: 0-15 puan
Uyku: 0-15 puan
Oyun: 0-15 puan
Çıkış: 0-15 puan
Toplam: 100
```

30. gün ve sonrasında kayıt girilirse çocuk kaydında:

```txt
uyumDurumu: tamamlandi
uyumTakibiAktif: false
uyumTamamlanmaTarihi: YYYY-MM-DD
```

şeklinde güncelleme yapılır.

### Öğretmen Fiziksel Gelişim

- Öğretmen sınıfındaki çocuk için boy, kilo ve baş çevresi ölçümü girebilir.
- `Kayıt Gir` ve `Geçmiş` tabları bulunur.
- Fiziksel gelişim geçmişinde sınıf kayıtları listelenir.
- Bu kayıtlar veli gelişim ekranında aylık gelişim ve sınıf ortalaması hesaplarında kullanılır.

### Öğretmen Haftanın Yıldızı

- Haftanın Yıldızı rozeti sadece cuma günü verilebilir.
- Öğretmen aynı cuma günü sınıftan birden fazla çocuğa ayrı ayrı rozet verebilir.
- Aynı hafta aynı çocuğa ikinci kez kayıt yapılırsa mevcut kayıt güncellenir.
- Verilen rozet sadece seçilen çocuğun velisinde görünür.
- Diğer öğrenci velileri bu rozeti göremez.

---

## Admin / Yönetici Paneli

Admin paneli kurum, sınıf, çocuk, öğretmen, veli ve kurum içi operasyonları yönetmek için tasarlanmıştır.

Başlıca görevler:

- Kurum bilgilerini yönetme
- Sınıf oluşturma ve düzenleme
- Öğretmen ekleme
- Veli ekleme
- Çocuk ekleme ve veli/sınıf bağlama
- Çocuk için uyum modülünü açma/kapatma
- Duyuru oluşturma
- Anket oluşturma
- Galeri paylaşımı
- Yemek listesi yönetimi
- Ödeme takibi
- Tema ayarları
- Abonelik / paket kontrolü

### Çocuk Formu / Uyum Ayarı

Çocuk ekleme veya düzenleme formunda `Uyum Modülü` kartı bulunur.

Seçenekler:

```txt
Mevcut öğrenci
Yeni başlayan
```

Yeni başlayan seçilirse:

- Uyum başlangıç tarihi girilir.
- 30 günlük uyum süreci başlatılır.
- Öğretmen uyum takibi ekranında çocuk görünür.
- Veli tarafında Uyum Skoru görünür.

Mevcut öğrenci seçilirse:

- Uyum takibi açılmaz.
- Veli tarafında Uyum Skoru kartı görünmez.
- Öğretmen uyum listesine düşmez.

---

## Firebase Veri Yapısı

Temel node yapısı:

```txt
kullanicilar/
kurumlar/
siniflar/
cocuklar/
gunlukRaporlar/
yoklamalar/
yemekListeleri/
etkinlikler/
duyurular/
anketler/
anketCevaplari/
mesajlar/
bildirimler/
fizikselGelisim/
haftaninRozetleri/
uyumKayitlari/
galeri/
odemeler/
```

### cocuklar/{cocukId}

Uyum modülüyle birlikte çocuk kaydında şu alanlar desteklenir:

```txt
ad
soyad
dogumTarihi
sinifId
kresId
veliIds

yeniBaslayan
uyumTakibiAktif
uyumBaslangicTarihi
uyumSureGun
uyumDurumu
uyumTamamlanmaTarihi
sonUyumSkoru
createdAt
updatedAt
```

### uyumKayitlari/{cocukId}_{YYYY-MM-DD}

```txt
kresId
sinifId
cocukId
tarih
gunNo
sabahDurumu
aglamaDakika
yemekDurumu
cikisDurumu
uykuDakika
oyunDurumu
milestones
ogretmenNotu
skor
kaydedenId
kaydedenAd
createdAt
updatedAt
```

### fizikselGelisim/{recordId}

```txt
kresId
sinifId
cocukId
boy
kilo
basCevresi
tarih / olcumTarihi
not
kaydedenId
kaydedenAd
createdAt
updatedAt
```

Bu kayıtlar:

- Öğretmen fiziksel gelişim geçmişinde,
- Veli aylık gelişim ekranında,
- Veli sınıf ortalaması tabında

kullanılır.

---

## Galeri ve Medya

Galeri ortak altyapısı:

```txt
src/screens/shared/GalleryScreenBase.js
src/screens/parent/ParentGalleryScreen.js
src/screens/admin/AdminGalleryScreen.js
src/screens/teacher/TeacherGalleryScreen.js
src/utils/saveGalleryMedia.js
```

Özellikler:

- Fotoğraf ve video desteklenir.
- Çoklu medya seçimi desteklenir.
- 1 medya büyük kart, 3 medya özel kompozisyon, 4+ medya grid ve `+N` overlay mantığıyla gösterilir.
- Medyaya tıklayınca uygulama içi viewer açılır.
- Video uygulama içinde oynatılır.
- `Kaydet` butonu medyayı cihaz galerisine indirir.
- Kaydedilen medya `Yumurcak` albümüne eklenir.

Gerekli paketler:

```txt
expo-file-system
expo-media-library
```

---

## Build / Kurulum

Bağımlılıkları yükle:

```bash
npm install --legacy-peer-deps
```

Expo kontrolü:

```bash
npx expo-doctor
```

Android prebuild:

```bash
npx expo prebuild --clean --platform android
```

Codemagic / release build öncesi kontrol:

```txt
- package-lock güncel mi?
- google-services.json doğru yerde mi?
- Firebase Realtime Database rules doğru mu?
- Firebase Storage rules doğru mu?
- Android targetSdkVersion 35 mi?
- EAS/Codemagic env değişkenleri doğru mu?
- RevenueCat ürünleri Google Play ile eşleşiyor mu?
```

---

## Test Senaryoları

### Uyum Modülü

1. Admin çocuk eklerken `Yeni başlayan` seç.
2. Uyum başlangıç tarihi gir.
3. Öğretmen hesabına geç.
4. Öğretmen panelinde `Uyum Modülü` kartını aç.
5. Çocuğun listede göründüğünü doğrula.
6. Günlük uyum formunu doldur ve kaydet.
7. Firebase `uyumKayitlari` node'una kayıt düştüğünü kontrol et.
8. Veli hesabına geç.
9. Veli ana ekranda `Uyum Skoru` kartının göründüğünü kontrol et.
10. İlk kayıt varsa skorun, yoksa `Skor Bekleniyor` durumunun göründüğünü kontrol et.
11. 30. gün sonunda aktif takip kapanırken geçmiş raporun kaldığını doğrula.

### Sınıf Ortalaması

1. Aynı sınıftaki en az 5 çocuk için aynı ay fiziksel ölçüm gir.
2. Veli hesabına geç.
3. `Gelişim > Sınıf Ortalaması` tabını aç.
4. Boy/kilo/baş çevresi barlarının göründüğünü kontrol et.
5. Başka çocuk adı veya tekil veri görünmediğini doğrula.
6. 5 kayıt altına düşen senaryoda gizlilik uyarısının çıktığını kontrol et.

### Galeri Kaydetme

1. Öğretmen veya admin galeriye fotoğraf/video yükle.
2. Veli galeri ekranında medyayı aç.
3. Fotoğrafın uygulama içinde açıldığını doğrula.
4. Videonun uygulama içinde oynadığını doğrula.
5. `Kaydet` butonuna bas.
6. İzin ver.
7. Medyanın cihaz galerisindeki `Yumurcak` albümüne düştüğünü kontrol et.

---

## Bilinen Kalan İşler

- Cloud Functions ile 24 saatten eski galeri dosyalarını Storage’dan fiziksel silme.
- Push notification gerçek cihaz testi.
- RevenueCat / Google Play abonelik ürün eşleştirme testi.
- Kapalı test build doğrulaması.
- Firebase security rules detaylı rol bazlı test.
- Sınıf Ortalaması için ileride admin kurum ayarı eklenebilir: `Velilere anonim sınıf ortalaması gösterilsin mi?`
- PDF rapor indirme özelliği şimdilik eklenmedi; ileride `expo-print` / paylaşım akışıyla değerlendirilebilir.

---

## Notlar

- Sınıf ortalaması ekranı tıbbi değerlendirme değildir.
- Sıralama ve çocuklar arası rekabet oluşturacak ifadeler özellikle kullanılmaz.
- Uyum skoru öğretmene günlük takip kolaylığı sağlamak için tasarlanmıştır; çocuğu etiketlemek veya kesin değerlendirme yapmak için kullanılmaz.
- Veliye gösterilen tüm karşılaştırmalar bilgilendirme amaçlıdır.
