# Yumurcak Kreş

Yumurcak Kreş; kreş yöneticisi, öğretmen ve veli panelleri olan Expo / React Native tabanlı mobil kreş takip uygulamasıdır. Amaç; kreşteki günlük akışı, çocuk takibini, veli iletişimini, duyuru/anket süreçlerini, yemek ve galeri paylaşımlarını tek uygulamada toplamaktır.

Proje şu an çalışan MVP + stabilizasyon seviyesindedir. Ana admin, öğretmen ve veli modülleri büyük ölçüde tamamlanmıştır. Güncel odak; gerçek cihaz build testi, Firebase Realtime Database / Storage rules doğrulaması, RevenueCat / Google Play abonelik bağlantısı, push notification fiziksel cihaz testi ve kapalı test hazırlığıdır.

> Son güncelleme: 25 Haziran 2026

---

## Teknoloji

```txt
Expo SDK: 54
React Native: 0.81.5
React: 19.1.0
Firebase: 12.0.0
Firebase Auth: kullanıcı girişi ve rol ayrımı
Firebase Realtime Database: uygulama verileri
Firebase Storage: profil, galeri ve yemek fotoğrafları
RevenueCat: react-native-purchases 9.0.0
Push: expo-notifications
Medya seçimi: expo-image-picker
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
| `yonetici` | Kurum, sınıf, çocuk, öğretmen, veli, ödeme, duyuru, anket, galeri, tema, abonelik, bildirim, yasal metin ve istatistik yönetimi |
| `ogretmen` | Kendi sınıfındaki çocuklar, yoklama, günlük rapor, medikal bilgi, fiziksel gelişim, yemek listesi, galeri, mesaj, duyuru, tema ve bildirim ekranları |
| `veli` | Çocuğa ait özet, günlük/aylık rapor, ödeme, yemek, gelişim, medikal bilgi, anket, galeri, mesaj, bildirim ve yasal metin ekranları |

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
- Öğretmen günlük rapor ekranı
- Yoklama sistemi
- Yemek listesi ve öğün fotoğrafı sistemi
- Galeri fotoğraf / video paylaşımı
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

### Veli paneli

- Anket ekranında `Cevabı değiştir` yazısı gerçek tıklanabilir butona çevrildi.
- Veli mesaj ekranı modern inbox tasarımına güncellendi.
- Veli mesaj ekranında kurum yönetimi ve öğretmen sohbetleri sade kartlarla ayrıldı.
- Veli özet ekranına doğum günü modu eklendi.
- Çocuğun doğum günü ise özet ekranında gün boyunca hareketli balon ve konfeti efekti çalışır.
- Doğum günü popup'ı aynı gün sadece bir kez gösterilir.
- Popup kapandıktan sonra ekran normal kullanılmaya devam eder.
- Balon ve konfeti overlay'i `pointerEvents="none"` mantığıyla çalışır; butonları, scroll'u ve tabbar'ı engellemez.

### Öğretmen paneli

- Çocuklarım ekranında yaş bilgisi ve doğum tarihi gösterimi düzeltildi.
- Doğum tarihi kullanıcıya `GG.AA.YYYY` formatında gösterilir.
- Günlük Rapor kartı artık çocuk seçme moduna gider; çocuk seçilince eski detaylı rapor formu açılır.
- Günlük raporda ruh hali, kahvaltı/öğle/ara öğün durumu, uyku, tuvalet ve öğretmen notu akışı korunur.
- Günlük yemek fotoğraf yükleme tarafında medya okuma yöntemi daha sağlam hale getirildi.
- Galeri fotoğraf/video yükleme tarafında medya okuma yöntemi daha sağlam hale getirildi.
- Fiziksel Gelişim ekranına `Kayıt Gir` ve `Geçmiş` tabları eklendi.
- Fiziksel gelişim geçmişinde tüm sınıf kayıtları listelenir.
- Öğretmen paneline `Doğum Günleri` ekranı eklendi.
- Doğum günleri en yakın tarihten en uzağa doğru sıralanır.
- Öğretmen mesaj ekranına yeni mesaj başlatmak için alttan açılan veli seçme çekmecesi eklendi.

### Admin paneli

- Çocuklar kartında doğum tarihi gösterimi `GG.AA.YYYY` formatına çevrildi.
- Çocuk listesi modern kart yapısı korunarak tarih formatı standartlaştırıldı.

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

### Veli Yemek Ekranı

- Bugünün yemekleri gösterilir.
- Kahvaltı, öğle ve ara öğün ayrı ayrı listelenir.
- Öğretmen fotoğraf eklediyse veli fotoğrafı görür.
- Aylık menü ve öğretmen günlük bildirimi birlikte desteklenir.
- Öğretmen sadece kahvaltı girdiyse diğer öğünlerde aylık menü bilgisi korunabilir.
- Son 7 günlük yemek kayıtları görüntülenebilir.

### Veli Anket Ekranı

- Aktif kurum/sınıf anketleri görünür.
- Seçenek kartlarına basarak cevap verilir.
- Cevap kaydedildikten sonra `Cevabı değiştir` butonu ile yeni cevap seçilebilir.
- Seçili cevap görsel olarak vurgulanır.

### Veli Mesaj Ekranı

- Kurum yönetimi ile mesajlaşma
- Öğretmen ile mesajlaşma
- Okunmamış mesaj rozeti
- Son mesaj önizlemesi
- Saat/tarih gösterimi
- Güvenli iletişim bilgi kartı

### Veli Galeri Ekranı

- Veli sadece kendi çocuğuna, çocuğunun sınıfına veya tüm kuruma hedeflenen aktif galeri içeriklerini görür.
- Fotoğraf/video görüntüleme desteklenir.
- Galeri içerikleri 24 saat aktif görünür.

### Veli Rapor ve Gelişim

- Günlük raporlar görüntülenir.
- Aylık rapor özeti oluşturulur.
- Aylık özet öğretmen raporlarından otomatik yorum çıkarır.
- Bu yorum tıbbi veya psikolojik tanı değildir.
- Fiziksel gelişim kayıtları veli tarafında gelişim ekranından takip edilir.

---

## Öğretmen Paneli

Öğretmen paneli sınıf günlük operasyonlarını yönetmek için tasarlanmıştır.

Ana modüller:

- Çocuklarım
- Doğum Günleri
- Günlük Rapor
- Yoklama
- Ders Programı
- Etkinlikler
- Yemek Listesi
- Galeri
- Medikal
- Fiziksel Gelişim
- Tema Ayarları
- Duyurular
- Mesajlar
- Profil

### Çocuklarım

- Öğretmenin sınıfındaki çocuklar listelenir.
- Çocuk kartı açılıp kapanabilir.
- Yaş ve doğum tarihi gösterilir.
- Doğum tarihi `GG.AA.YYYY` formatındadır.
- Veli bilgileri detay alanında görüntülenir.
- Bugün rapor girilen çocuklarda rozet görünür.

### Doğum Günleri

Öğretmenin sınıfındaki çocukların doğum günleri takip edilir.

Özellikler:

- En yakın doğum gününden en geç olana doğru sıralama
- Günü geçmiş doğum günlerini bir sonraki yıla göre hesaplama
- Bu ay doğum günü olan çocuk sayısı
- 30 gün içindeki yaklaşan doğum günü sayısı
- Bu yıl toplam doğum günü sayısı
- Çocuk adı, doğum tarihi, yaş ve kalan gün bilgisi

### Günlük Rapor

Günlük Rapor kartı önce çocuk seçme ekranına gider. Çocuğa basılınca rapor formu açılır.

Raporda bulunan alanlar:

- Ruh hali
- Kahvaltı durumu
- Öğle yemeği durumu
- Ara öğün durumu
- Uyku süresi
- Tuvalet sayısı
- Öğretmen notu

Yemek durumları:

```txt
Yemedi
Az yedi
Bitirdi
```

### Yemek Listesi

- Öğretmen günlük yemek listesi girebilir.
- Kahvaltı, öğle ve ara öğün ayrı ayrı güncellenebilir.
- Her öğüne açıklama ve fotoğraf eklenebilir.
- Fotoğraf kamera veya galeriden seçilebilir.
- Fotoğraf Firebase Storage'a yüklenir.
- Kayıt Realtime Database içinde `yemekListeleri` node'una yazılır.
- Son 7 günlük yemek kayıtları listelenir.
- Daha eski günlük yemek kayıtları ve uygun fotoğraflar temizlenmeye çalışılır.
- Fotoğraf upload tarafında `XMLHttpRequest + blob` medya okuma yöntemi kullanılır.

Storage path örnekleri:

```txt
yemekFotograflari/{kresId}/{sinifId}/{fileName}
galeri/{kresId}/yemekFotograflari/{sinifId}/{fileName}
```

Realtime Database yapı örneği:

```txt
yemekListeleri/{id}
  kresId
  sinifId
  tarih
  kaynak
  tip
  ogunler
    kahvalti
      text
      fotoUrl
      fotoPath
    ogle
      text
      fotoUrl
      fotoPath
    araOgun
      text
      fotoUrl
      fotoPath
```

### Galeri

- Öğretmen kendi sınıfı veya tek çocuk için fotoğraf/video yükleyebilir.
- Çoklu fotoğraf seçimi desteklenir.
- Video paylaşımı desteklenir.
- Paylaşımlar 24 saat görünür.
- Süresi dolan kayıtlar ekran açıldığında temizlenmeye çalışılır.
- Medya upload tarafında `XMLHttpRequest + blob` yöntemi kullanılır.

Galeri veri yapısı:

```txt
galeri/{galleryId}
  kresId
  targetType: school | class | student
  hedef: kurum | sinif | cocuk
  classId
  studentId
  sinifId
  cocukId
  cocukIds
  mediaItems
  mediaCount
  aciklama
  yukleyenId
  yukleyenAd
  yukleyenRol
  createdAt
  expiresAt
```

### Fiziksel Gelişim

Öğretmen çocuklara fiziksel gelişim kaydı girebilir.

Alanlar:

- Boy
- Kilo
- Baş çevresi
- Not

Ekran tabları:

```txt
Kayıt Gir
Geçmiş
```

Geçmiş tabında:

- Tüm sınıf kayıtları görünür.
- Çocuk adı
- Tarih
- Boy
- Kilo
- Baş çevresi
- Not

Kayıt node'u:

```txt
fizikselGelisim/{id}
  kresId
  sinifId
  cocukId
  cocukAdi
  ogretmenId
  boy
  kilo
  basCevresi
  not
  tarih
  createdAt
```

### Medikal

- Alerji bilgileri
- İlaç bilgileri
- Genel notlar
- Öğretmen gözlem notu
- Kart bazlı aç/kapat tasarım
- Öğretmen gözlem bilgisi ekleme/güncelleme

### Öğretmen Mesajları

- Kurum yönetimi ile mesajlaşma
- Sınıf velileriyle mesajlaşma
- Arama ve filtreleme
- Okunmamış mesaj rozeti
- Son mesaj ve saat gösterimi
- `Yeni Mesaj` butonuyla alttan açılan veli seçme çekmecesi
- Veli seçilince direkt sohbet ekranına geçiş

---

## Yönetici Paneli

Yönetici paneli kreş yönetiminin ana kontrol merkezidir.

Özellikler:

- Kurum bilgileri
- Sınıf yönetimi
- Öğretmen yönetimi
- Veli yönetimi
- Çocuk yönetimi
- Ödeme yönetimi
- Duyuru yönetimi
- Anket yönetimi
- Galeri yönetimi
- Tema yönetimi
- Abonelik yönetimi
- Bildirim merkezi
- Yasal metinlere erişim
- İstatistik ve takip ekranları

### Çocuk Yönetimi

- Çocuk kartları modern tasarımla listelenir.
- Sınıf, öğretmen ve veli bilgileri gösterilir.
- Doğum tarihi `GG.AA.YYYY` formatında gösterilir.
- Çocuk detay/form ekranına geçiş desteklenir.

### Anket Yönetimi

- Admin yeni anket oluşturabilir.
- Başlık ve açıklama girilebilir.
- Seçenekler ayrı ayrı eklenip silinebilir.
- Sonuçlar progress bar ile gösterilir.
- Anketler veli ekranında cevaplanabilir.

### Duyuru Yönetimi

- Kurum geneli duyuru
- Sınıf hedefli duyuru
- Veli/öğretmen hedefli duyuru
- Önemli duyuru etiketi
- Duyuru kartlarında tarih, rozet ve detay görünümü

### Ödeme Yönetimi

- Admin ödeme kaydı oluşturabilir.
- Veli ödeme ekranında son 12 ay ve tüm kayıtlar görüntülenebilir.
- Bekleyen ödeme veli özet ekranında hatırlatma olarak çıkar.

---

## Tema Sistemi

Tema sistemi iki katmanlıdır.

### 1. Kreş genel teması

Yönetici tarafından seçilir ve kreş kaydına yazılır.

```txt
kresler/{kresId}/temaAyarlari
  temaId
  patternEnabled
  updatedAt
```

### 2. Sınıf teması

Öğretmen kendi sınıfı için tema seçebilir.

```txt
kresler/{kresId}/sinifTemalari/{sinifId}
  temaId
  patternEnabled
  updatedAt
  updatedBy
```

Akış:

```txt
Öğretmen sınıf teması seçer
↓
Aynı sınıfın öğretmen ve velileri temayı görür
↓
Diğer sınıflar etkilenmez
```

Sınıf teması bulunamazsa kreş genel teması kullanılır.

---

## Mesajlaşma Sistemi

Mesajlaşma `mesajKonusmalari` node'u üzerinden çalışır.

Desteklenen konuşma tipleri:

- Admin - öğretmen
- Admin - veli
- Öğretmen - veli

Özellikler:

- Konuşma meta verisi
- Son mesaj önizlemesi
- Okunmamış mesaj rozeti
- Mesaj detay ekranı
- Android klavye resize uyumu
- Mesaj gönderiminden sonra yanlış hata alerti riskini azaltmak için `undefined` temizleme

---

## Bildirim Sistemi

Bildirim sistemi 3 katmanlıdır.

### FAZ 1 — Uygulama içi bildirim merkezi

Tamamlandı.

- Bildirim merkezi servisi
- Admin, öğretmen ve veli panellerinde bildirim butonu
- Ortak bildirim ekranı
- Rol / kullanıcı / kurum bazlı bildirim okuma mantığı

### FAZ 2 — Uygulama içi olay bildirimleri

Tamamlandı.

Aşağıdaki işlemler bildirim oluşturur:

- Admin duyuru oluşturunca hedefe göre bildirim
- Admin ödeme kaydı oluşturunca ilgili veliye bildirim
- Veli kurum zili gönderince admin / öğretmen bildirimi
- Mesaj gönderilince alıcıya bildirim

### FAZ 3 — Push notification

Kod altyapısı hazırdır; fiziksel cihaz testi gerekir.

- Expo push token alma
- Token'ı kullanıcı kaydına yazma
- Bildirim kaydı oluşturulurken uygun tokenlara Expo push gönderme altyapısı

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
Offering identifier: default
Packages: monthly, yearly
Entitlement display name: Premium
```

Kod tarafında eklenen servis:

```txt
src/services/revenueCat.js
```

Google Play ürünleri:

```txt
yumurcak_aylik_1500
yumurcak_yillik_15000
```

Not: Google Play ürünleri ve RevenueCat service account bağlantısı tamamlanmadan gerçek satın alma çalışmaz. Kod entegrasyonu ve iskelet hazırdır.

---

## Firebase Rules Durumu

Realtime Database tarafında geçiş rules seviyesi kullanılır:

```txt
.read  -> auth != null
.write -> auth != null
```

Storage tarafında profil, yemek ve galeri için path bazlı yazma izinleri gerekir.

Önemli Storage pathleri:

```txt
profilFotograflari/veliler/{fileName}
yemekFotograflari/{kresId}/{sinifId}/{fileName}
galeri/{kresId}/{galleryId}/{mediaId}.{extension}
galeri/{kresId}/yemekFotograflari/{sinifId}/{fileName}
```

Production güvenlik fazında hedef:

- Superadmin tüm platformu yönetebilir.
- Admin sadece kendi `kresId` verilerini yönetebilir.
- Öğretmen sadece kendi `kresId` / `sinifId` verilerini yönetebilir.
- Veli sadece kendi çocuğu, çocuğunun sınıfı ve kurum genel hedefli verileri okuyabilir.
- Storage yazma / silme işlemleri rol ve path bazlı daraltılır.

---

## Yasal Metinler

Uygulama içine aşağıdaki yasal metinler eklenmiştir:

```txt
Kullanım Şartları
Gizlilik Politikası
KVKK Aydınlatma Metni
```

Erişim noktaları:

- Giriş ekranı alt bağlantıları
- Veli profili
- Öğretmen profili
- Yönetici kurum bilgileri / ayarlar ekranı

Yasal metinlerde galeri içeriklerinin fotoğraf/video içerebileceği ve uygulama içinde 24 saat görünür olacak şekilde tasarlandığı belirtilmiştir. Fiziksel Storage temizliği için ileride Cloud Functions önerilir.

---

## Build Öncesi Kontrol

```bash
npm install
npx expo-doctor
npx expo start --clear
```

Kapalı test / build öncesi kontrol edilecek temel akışlar:

1. Admin giriş yapar.
2. Sınıf, öğretmen, veli ve çocuk bağlantıları kontrol edilir.
3. Admin çocuk kartlarında doğum tarihi `GG.AA.YYYY` görünür.
4. Öğretmen çocuklarım ekranında yaş ve doğum tarihi doğru görünür.
5. Öğretmen doğum günleri ekranı açılır ve sıralama doğru çalışır.
6. Öğretmen günlük rapora basar, çocuk seçer ve rapor formuna gider.
7. Öğretmen ruh hali, yemek, uyku, tuvalet ve not içeren günlük rapor girer.
8. Veli özet ekranında günlük rapor bilgileri görünür.
9. Doğum günü olan çocukla veli özet ekranı açılır; balon/konfeti ve popup kontrol edilir.
10. Popup kapatılınca aynı gün tekrar açılmadığı kontrol edilir.
11. Veli anket ekranında cevap verilir ve `Cevabı değiştir` butonu test edilir.
12. Öğretmen yemek listesine kahvaltı / öğle / ara öğün fotoğrafı ekler.
13. Veli bugünün fotoğraflı yemek listesini görür.
14. Öğretmen/Admin galeriye fotoğraf veya video yükler.
15. Veli galeri ekranında sadece kendi çocuğuna/sınıfına/kurumuna ait aktif kayıtları görür.
16. Öğretmen fiziksel gelişim kaydı girer.
17. Fiziksel gelişim geçmiş tabında kayıt görünür.
18. Öğretmen mesaj ekranında `Yeni Mesaj` çekmecesi açılır, veli seçilince sohbet açılır.
19. Veli mesaj ekranında kurum ve öğretmen kartları çalışır.
20. Admin ödeme kaydı oluşturur.
21. Veli ödeme ekranında son 12 ay ve tüm kayıtları görür.
22. Veli özet ekranında bekleyen ödeme hatırlatması görünür.
23. Tema değişimi admin / öğretmen / veli ekranlarına yansır.
24. Uygulama içi bildirim ekranları açılır.
25. Mesaj gönderimi sonrası yanlış hata alerti çıkmadığı kontrol edilir.
26. Chat ekranında klavye açılınca mesaj inputu görünür kalır.
27. Profil fotoğrafı upload test edilir.
28. Yemek fotoğrafı upload test edilir.
29. Galeri fotoğraf/video upload test edilir.
30. Firebase Storage hata mesajları kontrol edilir.
31. Push token ve push bildirim fiziksel cihazda test edilir.
32. Giriş ekranından yasal metinler açılır.
33. Veli, öğretmen ve admin profil/ayar alanlarından yasal metinler açılır.

---

## Google Play Öncesi Kontrol Listesi

```txt
- Expo doctor temiz olmalı.
- Android package doğru olmalı: com.furukcell.yumurcakapp
- versionCode kapalı test / yeni build için gerekirse artırılmalı.
- targetSdkVersion 35 olarak kalmalı.
- Firebase Storage foto/video upload gerçek cihazda test edilmeli.
- Realtime Database auth rules ile tüm roller test edilmeli.
- RevenueCat ürünleri Google Play ürünlerine bağlanmalı.
- Kapalı test kullanıcısı satın alma / restore akışını test etmeli.
- Push notification fiziksel cihazda test edilmeli.
- Uygulama içi yasal metinler erişilebilir olmalı.
- Veli doğum günü modu ve animasyonların düşük cihazlarda performansı kontrol edilmeli.
```

---

## Kısa Durum Özeti

```txt
Admin temel yönetim: Hazır
Öğretmen günlük operasyon: Hazır
Veli takip ekranları: Hazır
Tema sistemi: Hazır / gerçek veri testi gerekli
Mesajlaşma: Hazır / gerçek cihaz testi gerekli
Galeri: Hazır / Storage rules ve cihaz testi gerekli
Yemek fotoğrafı: Hazır / Storage rules ve cihaz testi gerekli
Fiziksel gelişim geçmişi: Hazır
Doğum günü ekranları: Hazır
Doğum günü animasyon modu: Hazır
RevenueCat: Kod altyapısı hazır / Play ürün bağlantısı gerekli
Push notification: Kod altyapısı hazır / fiziksel cihaz testi gerekli
Yasal metinler: Hazır
Google Play kapalı test: Build ve gerçek cihaz doğrulaması sonrası hazır
```
