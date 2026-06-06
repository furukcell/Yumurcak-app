# Yumurcak Kreş Yol Haritası

Bu doküman, **Yumurcak Kreş** uygulamasının mevcut prototip aşamasından çalışan, güvenli ve pilot kullanıma hazır bir MVP seviyesine taşınması için hazırlanmıştır.

Yumurcak Kreş; kreş, öğretmen ve veli arasındaki günlük iletişimi dijitalleştirmeyi hedefleyen mobil bir uygulamadır. İlk hedef; öğretmenin çocuk için günlük rapor girmesi, velinin bu raporu güvenli şekilde görüntülemesi ve kreş yöneticisinin temel kullanıcı/sınıf/çocuk yönetimini yapabilmesidir.

---

## 1. Genel Öncelik

Yumurcak için ilk hedef yeni özellik eklemek değil, mevcut yapıyı sadeleştirip çalışan bir MVP iskeletine dönüştürmektir.

Öncelik sırası:

```txt
Çalışsın
↓
Güvenli olsun
↓
Basit olsun
↓
Pilot kreşte denensin
↓
Sonra büyüsün
```

---

## 2. MVP Tanımı

Yumurcak'ın ilk MVP hedefi şudur:

> Bir kreş, çocukların günlük durum raporlarını öğretmenler üzerinden girip velilere uygulama içinde güvenli şekilde ulaştırabiliyor mu?

Bu soru net şekilde evet olana kadar ek özelliklere geçilmemelidir.

İlk MVP'de olması gerekenler:

- Giriş sistemi
- Rol bazlı yönlendirme
- Yönetici paneli
- Öğretmen paneli
- Veli paneli
- Sınıf yönetimi
- Çocuk yönetimi
- Öğretmen / veli bağlantısı
- Günlük çocuk raporu
- Duyuru sistemi
- Push bildirim altyapısı
- Firebase güvenlik kuralları
- Uçtan uca test hesapları

---

## 3. İlk Aşamada Olmayacak Özellikler

Projeyi büyütüp dağıtmamak için ilk MVP dışında tutulacak özellikler:

- Veli-öğretmen mesajlaşması
- Fotoğraf yükleme
- Video yükleme
- Canlı kamera
- Servis takibi
- Detaylı yemek menüsü
- PDF rapor çıktısı
- Aylık gelişim analizi
- AI yorum / AI özet
- Çoklu şube sistemi
- Ödeme entegrasyonu
- Gelişmiş istatistik paneli

Bu özellikler pilot kullanım sonrası gerçek ihtiyaçlara göre eklenmelidir.

---

## 4. Teknik Toparlama Planı

### 4.1 App.js Düzenlemesi

Öncelikle uygulamanın ana giriş noktası netleştirilmelidir.

Yapılacaklar:

- `App.js` dosyası kontrol edilecek.
- `NavigationContainer` doğru şekilde bağlanacak.
- `AuthProvider` doğru şekilde sarmalanacak.
- `RootNavigator` uygulamanın ana yönlendirme merkezi olacak.
- Boş veya çalışmayan `return` yapısı varsa düzeltilecek.
- Uygulama açıldığında oturum kontrolü yapılacak.

Beklenen akış:

```txt
Uygulama açılır
↓
Oturum var mı kontrol edilir
↓
Oturum yoksa Login ekranı açılır
↓
Oturum varsa kullanıcı rolü okunur
↓
Rolüne göre ilgili panele yönlendirilir
```

---

### 4.2 Eski ve Yeni Ekran Yapılarının Ayrılması

Projede eski `screens/` klasörü ile yeni `src/screens/` yapısı birlikte bulunuyorsa bu karışıklık giderilmelidir.

Hedef klasör yapısı:

```txt
src/
  components/
  config/
  context/
  hooks/
  navigation/
  screens/
  types/
  utils/
```

Yapılacaklar:

- Kullanılacak ana ekran yapısı seçilecek.
- Eski ekranlar kullanılmıyorsa silinecek veya `legacy/` klasörüne taşınacak.
- Tüm aktif ekranlar `src/screens/` altında toplanacak.
- Navigation dosyaları sadece aktif ekranları çağıracak.

Amaç:

> Uygulamada tek bir ekran sistemi, tek bir navigation yapısı ve tek bir giriş akışı olmalıdır.

---

### 4.3 Giriş Sisteminin Tekleştirilmesi

Üretim için tek ve güvenli giriş sistemi kullanılmalıdır.

Doğru yapı:

```txt
Firebase Authentication
+
Realtime Database kullanıcı profili
```

Yapılacaklar:

- Manuel kullanıcı adı / şifre kontrolü kaldırılacak.
- Şifreler Realtime Database içinde düz metin tutulmayacak.
- Firebase Auth email/password kullanılacak.
- Kullanıcının rolü Realtime Database üzerinden okunacak.
- Kullanıcı profili `kullanicilar/{uid}` altında tutulacak.

Önerilen kullanıcı profili:

```txt
kullanicilar/{uid}
  ad
  email
  rol
  kresId
  aktif
  createdAt
```

Roller için tek dil seçilmelidir:

```txt
yonetici
ogretmen
veli
```

veya

```txt
admin
teacher
parent
```

Türkçe ve İngilizce alan adları karışık kullanılmamalıdır.

---

## 5. Firebase Veri Modeli

Yumurcak için sade ve anlaşılır bir veri modeli yeterlidir.

Önerilen ana node yapısı:

```txt
kresler/
kullanicilar/
siniflar/
cocuklar/
raporlar/
duyurular/
bildirimTokenlari/
```

### 5.1 Kreşler

```txt
kresler/{kresId}
  ad
  adres
  telefon
  aktif
  createdAt
```

### 5.2 Kullanıcılar

```txt
kullanicilar/{uid}
  ad
  email
  rol
  kresId
  aktif
  createdAt
```

Roller:

```txt
yonetici
ogretmen
veli
```

### 5.3 Sınıflar

```txt
siniflar/{sinifId}
  kresId
  ad
  ogretmenIds
  aktif
  createdAt
```

### 5.4 Çocuklar

```txt
cocuklar/{cocukId}
  kresId
  sinifId
  ad
  dogumTarihi
  veliIds
  aktif
  createdAt
```

### 5.5 Raporlar

```txt
raporlar/{raporId}
  kresId
  cocukId
  sinifId
  ogretmenId
  tarih
  ruhHali
  yemek
  uyku
  tuvalet
  not
  createdAt
```

### 5.6 Duyurular

```txt
duyurular/{duyuruId}
  kresId
  baslik
  mesaj
  oncelik
  hedef
  createdAt
```

### 5.7 Bildirim Tokenları

```txt
bildirimTokenlari/{uid}
  token
  platform
  updatedAt
```

---

## 6. Build ve Expo Ayarları

### 6.1 app.json Kontrolü

Yapılacaklar:

- `app.json` JSON formatı doğrulanacak.
- Eksik virgül, yanlış kapanan blok veya hatalı alanlar düzeltilecek.
- Android package adı netleştirilecek.
- Uygulama adı netleştirilecek.
- Splash screen ve ikon dosyaları kontrol edilecek.
- Expo project ID placeholder kalmayacak.

Önerilen Android package:

```txt
com.yumurcak.kres
```

Önerilen uygulama adı:

```txt
Yumurcak Kreş
```

Kontrol komutu:

```bash
npx expo doctor
```

### 6.2 Build Testi

Android build öncesi:

```bash
npm install
npx expo start
```

Production build için:

```bash
eas build --platform android --profile production
```

---

## 7. Yönetici Paneli

Yönetici paneli MVP için sade tutulmalıdır.

Yönetici yapabilecekleri:

- Sınıf oluşturma
- Sınıf listeleme
- Öğretmen ekleme
- Veli ekleme
- Çocuk ekleme
- Çocuğu sınıfa bağlama
- Çocuğu veliye bağlama
- Duyuru oluşturma
- Duyuru listeleme

Önerilen yönetici menüsü:

```txt
Sınıflar
Çocuklar
Öğretmenler
Veliler
Duyurular
Ayarlar
```

İlk MVP'de gelişmiş istatistik veya grafik gerekli değildir.

---

## 8. Öğretmen Paneli

Öğretmen panelinin ana amacı, öğretmenin kendi sınıfındaki çocuklara günlük rapor girmesidir.

Öğretmen akışı:

```txt
Öğretmen giriş yapar
↓
Kendi sınıfını veya sınıflarını görür
↓
Çocuk listesini görür
↓
Çocuğa tıklar
↓
Bugünkü raporu girer
↓
Kaydet der
↓
Veliye bildirim gider
```

Günlük rapor alanları:

```txt
Ruh hali
Yemek durumu
Uyku süresi
Tuvalet durumu
Genel not
```

---

## 9. Veli Paneli

Veli paneli ilk sürümde çok sade olmalıdır.

Veli yapabilecekleri:

- Kendisine bağlı çocukları görüntüleme
- Çocuğun günlük raporlarını görüntüleme
- Duyuruları görüntüleme

Veli akışı:

```txt
Veli giriş yapar
↓
Çocuğunu veya çocuklarını görür
↓
Çocuğa tıklar
↓
Rapor geçmişini görür
↓
Bugünkü raporu en üstte görür
```

İlk MVP'de veli-öğretmen mesajlaşması eklenmemelidir.

---

## 10. Günlük Rapor Sistemi

Yumurcak'ın ana ürünü günlük rapor sistemidir.

Örnek rapor ekranı:

```txt
Bugünkü ruh hali:
Mutlu / Normal / Huzursuz / Yorgun

Yemek:
İyi yedi / Az yedi / Yemedi

Uyku:
Uyudu / Uyumadı
Süre: 1 saat / 2 saat

Tuvalet:
Normal / Az / Sorun var

Öğretmen notu:
Bugün çok neşeliydi.
```

Rapor kaydetme mantığı:

```txt
Öğretmen raporu kaydeder
↓
raporlar/{raporId} altına veri yazılır
↓
Çocuğun veliIds alanı okunur
↓
Velilere bildirim gönderilir
```

Aynı çocuğa aynı gün tekrar rapor girilirse:

- Mevcut rapor güncellenebilir
- veya kullanıcıya "Bugün için rapor var, düzenlemek ister misiniz?" uyarısı gösterilebilir

---

## 11. Bildirim Sistemi

Bildirim sistemi MVP için ikinci önceliktir. Önce rapor kayıt akışı çalışmalıdır.

Bildirim kullanım alanları:

- Yeni günlük rapor bildirimi
- Yeni duyuru bildirimi
- Acil duyuru bildirimi

Örnek rapor bildirimi:

```txt
Zeynep için bugünkü rapor hazır.
```

Örnek duyuru bildirimi:

```txt
Yumurcak Kreş yeni bir duyuru paylaştı.
```

Bildirim akışı:

```txt
Kullanıcı giriş yapar
↓
Push token alınır
↓
Token Firebase'e kaydedilir
↓
Rapor veya duyuru oluşunca ilgili kullanıcıların tokenları okunur
↓
Bildirim gönderilir
```

Üretim aşamasında bildirim gönderimi mümkünse Cloud Functions üzerinden yapılmalıdır.

---

## 12. Firebase Security Rules

Yumurcak'ta çocuk verisi bulunduğu için güvenlik en kritik konulardan biridir.

Temel kural hedefleri:

- Yönetici sadece kendi kreşinin verisini görebilmeli.
- Öğretmen sadece kendi sınıfındaki çocukları görebilmeli.
- Veli sadece kendi çocuğunu görebilmeli.
- Raporu öğretmen veya yönetici yazabilmeli.
- Veli rapor okuyabilmeli ama değiştirememeli.
- Farklı kreşlerin verileri birbirine kapalı olmalı.

Bu kurallar tamamlanmadan uygulama geniş kullanıma açılmamalıdır.

---

## 13. Test Hesapları ve Test Senaryosu

MVP testleri için üç temel hesap oluşturulmalıdır.

Örnek hesaplar:

```txt
admin@yumurcak.com
ogretmen@yumurcak.com
veli@yumurcak.com
```

Örnek test verisi:

```txt
Kreş: Yumurcak Kreş
Sınıf: Minikler
Öğretmen: Ayşe Öğretmen
Veli: Faruk Veli
Çocuk: Zeynep
```

Uçtan uca test senaryosu:

```txt
Admin giriş yapar
↓
Sınıf oluşturur
↓
Öğretmen oluşturur
↓
Veli oluşturur
↓
Çocuk oluşturur
↓
Çocuğu sınıfa ve veliye bağlar
↓
Öğretmen giriş yapar
↓
Çocuğa günlük rapor girer
↓
Veli giriş yapar
↓
Raporu görür
```

Bu senaryo hatasız çalışıyorsa MVP'nin ana omurgası tamamdır.

---

## 14. Tasarım Yaklaşımı

Yumurcak, Gayıt gibi ciddi bir pazar yeri uygulaması değil; aile, çocuk ve güven odaklı bir kreş uygulamasıdır.

Tasarım hissi:

```txt
Sıcak
Güvenli
Yumuşak
Renkli ama karışık değil
Anne-babaya güven veren
```

Renk önerileri:

```txt
Pastel sarı
Pastel mavi
Pastel yeşil
Beyaz zemin
Yuvarlak kartlar
Büyük okunaklı yazılar
```

Tasarımda öncelik:

- Kolay okunabilirlik
- Büyük butonlar
- Az seçenek
- Basit rapor görüntüleme
- Veli için güven veren ekranlar

---

## 15. İş Modeli

Yumurcak için en uygun model B2B abonelik modelidir.

Önerilen model:

```txt
Kreş öder, veli ücretsiz kullanır.
```

Bireysel veliden ücret almak ilk aşamada önerilmez. Çünkü veli tarafında "çocuğumu görmek için para ödüyorum" algısı oluşabilir.

### 15.1 Örnek Paketler

#### Başlangıç Paketi

```txt
499 TL / ay
1 kreş
3 sınıf
50 çocuk
Günlük rapor
Duyuru
```

#### Standart Paket

```txt
999 TL / ay
1 kreş
10 sınıf
150 çocuk
Günlük rapor
Duyuru
Bildirim
Rapor geçmişi
```

#### Premium Paket

```txt
1499 TL / ay
Sınırsız sınıf
Sınırsız çocuk
Fotoğraflı rapor
Gelişim notları
PDF çıktı
```

İlk pilot aşamada ödeme entegrasyonu şart değildir. Pilot kreşle manuel ödeme veya ücretsiz deneme modeli uygulanabilir.

---

## 16. Pilot Kreş Planı

Kod toparlandıktan sonra uygulama doğrudan geniş kitleye açılmamalıdır. Önce bir pilot kreşte denenmelidir.

Pilot hedef:

```txt
1 kreş
1 yönetici
2 öğretmen
10 veli
15 çocuk
2 hafta test
```

Pilot testte ölçülecek sorular:

- Öğretmen rapor girmeyi kolay buluyor mu?
- Veli raporu kolay anlıyor mu?
- Bildirimler düzgün geliyor mu?
- Yönetici çocuk ve sınıf eklerken zorlanıyor mu?
- Uygulama her gün kullanılabilir mi?
- Öğretmenler günlük rapor girmeyi ek yük olarak mı görüyor?
- Veliler uygulamayı değerli buluyor mu?

---

## 17. Kod Temizliği Sırası

Kod temizliği şu sırayla yapılmalıdır:

```txt
1. App.js
2. app.json
3. src/navigation
4. AuthContext
5. firebase.ts
6. LoginScreen
7. AdminDashboard
8. TeacherDashboard
9. ParentDashboard
10. ChildReportScreen
11. database.rules.json
12. Bildirim hookları
13. Gereksiz eski ekranların temizlenmesi
```

---

## 18. Uygulama Geliştirme Sırası

Yumurcak için önerilen geliştirme sırası:

```txt
1. App.js çalışır hale getirilecek
2. app.json düzeltilecek
3. Eski/yeni ekran karmaşası temizlenecek
4. Firebase Auth tek giriş sistemi yapılacak
5. Rol bazlı yönlendirme netleşecek
6. Veri modeli sadeleştirilecek
7. Admin sınıf/çocuk/veli/öğretmen ekleyebilecek
8. Öğretmen çocuğa günlük rapor girebilecek
9. Veli çocuğunun raporunu görebilecek
10. Duyuru sistemi çalışacak
11. Bildirim sistemi bağlanacak
12. Firebase rules güvenli hale getirilecek
13. 3 test hesabıyla uçtan uca test yapılacak
14. Gereksiz özellikler ertelenecek
15. Pilot kreş için demo hazırlanacak
```

---

## 19. Öncelik Matrisi

| Öncelik | İş | Durum |
|---|---|---|
| Kritik | App.js ve navigation akışı | Yapılacak |
| Kritik | app.json build düzeltmeleri | Yapılacak |
| Kritik | Firebase Auth'a geçiş | Yapılacak |
| Kritik | Rol bazlı yönlendirme | Yapılacak |
| Kritik | Firebase Security Rules | Yapılacak |
| Yüksek | Günlük rapor sistemi | Yapılacak |
| Yüksek | Yönetici temel veri yönetimi | Yapılacak |
| Yüksek | Veli rapor görüntüleme | Yapılacak |
| Orta | Duyuru sistemi | Yapılacak |
| Orta | Push bildirim | Yapılacak |
| Düşük | Fotoğraflı rapor | Sonraki sürüm |
| Düşük | Mesajlaşma | Sonraki sürüm |
| Düşük | PDF çıktı | Sonraki sürüm |
| Düşük | AI rapor | Sonraki sürüm |

---

## 20. Sürüm Planı

### v0.1 - Teknik Toparlama

- App.js düzenlenir
- Navigation bağlanır
- app.json düzeltilir
- Eski ekran karmaşası temizlenir

### v0.2 - Auth ve Rol Sistemi

- Firebase Auth aktif hale getirilir
- Kullanıcı profili database'e bağlanır
- Yönetici / öğretmen / veli yönlendirmesi yapılır

### v0.3 - Yönetici MVP

- Sınıf ekleme
- Öğretmen ekleme
- Veli ekleme
- Çocuk ekleme
- Çocuk-sınıf-veli bağlantısı

### v0.4 - Öğretmen MVP

- Öğretmen kendi sınıfını görür
- Çocuk listesini görür
- Günlük rapor girer

### v0.5 - Veli MVP

- Veli kendi çocuğunu görür
- Rapor geçmişini görür
- Bugünkü raporu görüntüler

### v0.6 - Duyuru ve Bildirim

- Yönetici duyuru gönderir
- Veli duyuruyu görür
- Push bildirim altyapısı bağlanır

### v0.7 - Güvenlik ve Pilot Hazırlık

- Firebase rules güçlendirilir
- Test hesapları oluşturulur
- Pilot kreş senaryosu denenir

### v1.0 - Pilot Sürüm

- 1 pilot kreş ile gerçek kullanım testi
- Öğretmen ve veli geri bildirimleri toplanır
- Hatalar düzeltilir
- Sonraki özellik listesi gerçek kullanıma göre belirlenir

---

## 21. Gayıt ile Stratejik Konumlandırma

Gayıt, daha büyük ve karmaşık bir yerel hizmet pazaryeri uygulamasıdır. Yumurcak ise daha kapalı, daha sade ve B2B satışı daha kolay olabilecek bir kreş yönetim / veli iletişim ürünüdür.

Gayıt'tan öğrenilecek şeyler Yumurcak'a aktarılmalıdır:

- Google Play süreci
- Firebase güvenlik tecrübesi
- Bildirim sistemi tecrübesi
- Admin panel mantığı
- Gerçek kullanıcı geri bildirimi
- Lansman ve saha iletişimi
- KVKK / gizlilik metni hazırlığı

Yumurcak, Gayıt'tan sonra daha temiz mimariyle ilerletilmelidir.

---

## 22. Nihai Hedef

Yumurcak'ın nihai hedefi:

> Kreşlerin velilere daha profesyonel, düzenli ve güvenilir şekilde günlük çocuk bilgisi sunmasını sağlayan sade bir mobil uygulama olmak.

İlk hedef büyük ve karmaşık bir sistem kurmak değildir.

İlk hedef:

```txt
Bir öğretmen kolayca rapor girebilsin.
Bir veli çocuğunun raporunu güvenle görebilsin.
Bir yönetici sınıf, çocuk, öğretmen ve veli bağlantısını yönetebilsin.
```

Bu üç temel şey sağlam çalışıyorsa Yumurcak ürünleşmeye başlamış demektir.
