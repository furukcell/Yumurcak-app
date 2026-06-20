# Yumurcak Kreş

**Yumurcak Kreş**, kreş yönetimi, öğretmen, veli ve kurum sahibi arasındaki günlük iletişimi dijitalleştirmek için geliştirilen React Native / Expo tabanlı mobil kreş takip uygulamasıdır.

Uygulama ile:

- **Süper Admin** platformdaki kreşleri, abonelikleri, demo süreçlerini ve Firebase veri düzenini takip eder.
- **Kurum yöneticisi** sınıf, çocuk, öğretmen, veli, duyuru, ödeme, ders programı, etkinlik, kurum bilgileri, abonelik ve mesajlaşma süreçlerini yönetir.
- **Öğretmen** kendi sınıfındaki çocuklar için günlük rapor girer, yoklama alır, velilerle ve kurum yönetimiyle mesajlaşır.
- **Veli** sadece kendisine bağlı çocuğun bilgilerini, günlük raporlarını, yoklama durumunu, duyuruları, yemek listesini, etkinlikleri ve kurum iletişim bilgilerini görür.

Proje artık fikir aşamasını geçmiş, çalışan **MVP / SaaS altyapısı** seviyesine gelmiştir. Güncel odak: gerçek cihaz testleri, pilot kreş demosu, Firebase Auth geçişinin tamamlanması ve production güvenlik kurallarına geçiştir.

---

## Güncel Durum

- Android APK açılıyor.
- Expo SDK 54 / React Native altyapısı çalışıyor.
- Firebase Realtime Database bağlantısı çalışıyor.
- Firebase Storage bağlantısı eklendi.
- Firebase Auth hibrit geçiş sistemi kuruldu.
- Eski kullanıcı adı / şifre fallback sistemi hâlâ korunuyor.
- Auth migration ekranı ile kullanıcılar Firebase Auth sistemine taşınabiliyor.
- `authUid` ve `authKullaniciIndex` eşleme sistemi çalışıyor.
- Rol bazlı yönlendirme çalışıyor.
- `superadmin`, `yonetici`, `ogretmen`, `veli` rolleri ayrılmış durumda.
- Süper Admin paneli eklendi.
- Süper Admin yeni kreş onboarding akışı eklendi.
- Kurum yöneticisi, öğretmen ve veli panelleri ayrılmış durumda.
- Abonelik guard sistemi eklendi.
- Abonelik yok/bitti/pasif ise öğretmen ve veli kilit ekranı görür.
- Abonelik yok/bitti/pasif ise yönetici abonelik/ödeme ekranına yönlenir.
- Süper Admin abonelik kilidinden etkilenmez.
- Mesajlaşma input sorunu düzeltildi.
- Mesajlaşma son 20 mesaj + daha fazla yükle + okundu bildirimi desteği eklendi.
- Konuşma listelerinde okunmamış mesaj badge sistemi eklendi.
- Firebase kreş bazlı index yapısı eklendi.
- Firebase index migration ekranı eklendi.
- Yönetici, öğretmen ve veli mesajlaşma sistemi çalışır durumda.
- Öğretmen günlük rapor girebiliyor.
- Öğretmen yoklama alabiliyor.
- Veli günlük raporları ve yoklama geçmişini görebiliyor.
- Duyuru, yemek listesi ve etkinlik akışları kullanılabilir durumda.
- Profil fotoğrafı galeri seçimi ve Firebase Storage yükleme eklendi.
- Abonelik / demo / promosyon altyapısı eklendi.
- Codemagic üzerinden release APK alınabiliyor.
- Production Firebase rules dosyaları taslak/hazır durumdadır; doğrudan uygulanmadan önce Auth geçişi tamamlanmalıdır.

---

## Proje Amacı

Kreşlerde velilerin en çok merak ettiği konular:

- Çocuğum bugün nasıldı?
- Yemek yedi mi?
- Uyudu mu?
- Yoklaması nasıl?
- Öğretmen notu var mı?
- Kreşten duyuru veya etkinlik bilgisi var mı?
- Kurumla veya öğretmenle hızlıca iletişime geçebilir miyim?

Yumurcak Kreş, bu bilgileri WhatsApp grupları yerine daha düzenli, güvenli, takip edilebilir ve profesyonel bir sisteme taşımayı hedefler.

---

## Kullanıcı Rolleri

| Rol | Açıklama |
| --- | --- |
| `superadmin` | Platform sahibi. Tüm kreşleri, abonelikleri, demo süreçlerini ve Firebase index bakımını yönetir. |
| `yonetici` | Kreş yönetimi. Sınıf, çocuk, öğretmen, veli, duyuru, ödeme, abonelik, kurum bilgileri ve diğer yönetim işlemlerini yapar. |
| `ogretmen` | Kendi sınıfındaki çocuklar için günlük rapor girer, yoklama alır, velilerle ve yönetimle mesajlaşır. |
| `veli` | Sadece kendisine bağlı çocuğun bilgilerini, raporlarını ve ilgili içerikleri görüntüler. |

---

## MVP Akışı

1. Süper Admin giriş yapar.
2. Yeni kreş oluşturur.
3. Kreş için kurum yöneticisi kullanıcı adı/şifresi oluşturur.
4. Kreş için demo abonelik başlatılır.
5. Kurum yöneticisi giriş yapar.
6. Sınıf oluşturur.
7. Öğretmen ekler ve sınıfa bağlar.
8. Veli ekler.
9. Çocuk ekler.
10. Çocuğu sınıfa ve veliye bağlar.
11. Öğretmen giriş yapar.
12. Kendi sınıfındaki çocukları görür.
13. Günlük rapor girer.
14. Yoklama alır.
15. Veli giriş yapar.
16. Kendisine bağlı çocuğun raporunu ve yoklama durumunu görüntüler.
17. Veli öğretmenle veya kurum yönetimiyle mesajlaşır.
18. Yönetici abonelik / demo / promo sürecini yönetir.
19. Firebase Auth geçiş ekranından kullanıcılar Auth sistemine taşınır.
20. Production rules uygulanmadan önce tüm roller gerçek cihazda test edilir.

---

## Teknolojiler

- Expo SDK 54
- React Native
- JavaScript
- Firebase Realtime Database
- Firebase Auth
- Firebase Storage
- AsyncStorage
- React Navigation
- Expo Image Picker
- Codemagic Android APK build

---

## Firebase Veri Modeli

Temel ana node yapısı:

```txt
kullanicilar/
kresler/
siniflar/
cocuklar/
gunlukRaporlar/
yoklamalar/
duyurular/
yemekListeleri/
odemeler/
dersProgramlari/
etkinlikler/
mesajKonusmalari/
mesajlar/
abonelikler/
promosyonKodlari/
promosyonKullanimlari/
authKullaniciIndex/
medikalBilgiler/
```

FAZ 17 sonrası ek index node yapısı:

```txt
kresKullanicilari/
kullaniciKresleri/
kresCocuklari/
sinifCocuklari/
veliCocuklari/
kresSiniflari/
ogretmenSiniflari/
kullaniciKonusmalari/
kresKonusmalari/
cocukKonusmalari/
sinifKonusmalari/
```

Ana veri hâlâ kendi ana node’larında tutulur. Index node’ları sadece hızlı erişim, console düzeni ve production rules için yardımcı işaretçi olarak kullanılır.

---

## Kullanıcılar

```txt
kullanicilar/{uid}
  kullaniciAdi
  sifre
  ad
  soyad
  rol: superadmin / yonetici / ogretmen / veli
  aktif
  kresId
  sinifId
  telefon
  authUid
  email
  authProvider
  authMigratedAt
  profilFotoUrl
  createdAt
  updatedAt
```

Firebase Auth geçişinden sonra kullanıcıda şu alanlar oluşur:

```txt
authUid: firebaseAuthUid
email: kullaniciAdi@yumurcak.local
authProvider: firebase
authMigratedAt
```

Auth eşleme yapısı:

```txt
authKullaniciIndex/{firebaseAuthUid} = eskiKullaniciId
```

---

## Süper Admin

Süper Admin paneli platform sahibi için ayrılmıştır.

Süper Admin rolü:

```txt
rol: superadmin
```

Süper Admin panelinde:

- Toplam kreş sayısı
- Toplam öğrenci sayısı
- Toplam öğretmen sayısı
- Toplam veli sayısı
- Aktif/demo abonelik sayısı
- Biten abonelik sayısı
- Yaklaşan abonelik sayısı
- İl/ilçe dağılımı
- Kreş listesi
- Kreş detay ekranı
- Yeni kreş ekleme
- Kurum yöneticisi oluşturma
- Demo abonelik başlatma
- Firebase index migration ekranı

bulunur.

Örnek süper admin kaydı:

```txt
kullanicilar/superadmin001
  ad: Faruk
  soyad: Kurtuluş
  kullaniciAdi: faruk
  sifre: faruk123
  rol: superadmin
  aktif: true
```

Production rules sonrası süper adminin de Firebase Auth’a taşınmış olması gerekir.

---

## Kreşler

```txt
kresler/{kresId}
  id
  ad
  kresAdi
  il
  ilce
  adres
  telefon
  email
  yoneticiId
  yoneticiAd
  yoneticiTelefon
  aktif
  createdAt
  updatedAt
```

Süper Admin yeni kreş oluşturduğunda:

```txt
kresler/{kresId}
kullanicilar/{yoneticiId}
abonelikler/{kresId}
kresKullanicilari/{kresId}/yoneticiler/{yoneticiId}: true
kullaniciKresleri/{yoneticiId}/{kresId}: true
```

kayıtları oluşur.

---

## Çocuklar

```txt
cocuklar/{cocukId}
  ad
  soyad
  dogumTarihi
  kresId
  sinifId
  veliIds
  ogretmenId
  createdAt
  updatedAt
```

Veli çocuğu görebilsin diye çocuk kaydında şu bağlantı olmalıdır:

```txt
veliIds: ["veli001"]
```

Index yapısı:

```txt
kresCocuklari/{kresId}/{cocukId}: true
sinifCocuklari/{sinifId}/{cocukId}: true
veliCocuklari/{veliId}/{cocukId}: true
```

---

## Günlük Raporlar

```txt
gunlukRaporlar/{raporId}
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
  updatedAt
```

Yemek alanı detaylı yapıdadır:

```txt
yemek:
  kahvalti:
    durum
    not
  ogle:
    durum
    not
  araOgun:
    durum
    not
```

---

## Yoklamalar

```txt
yoklamalar/{tarih}_{cocukId}
  id
  kresId
  sinifId
  cocukId
  ogretmenId
  tarih
  durum
  createdAt
  updatedAt
```

Örnek durumlar:

```txt
geldi
gelmedi
izinli
gec
```

---

## Duyurular

```txt
duyurular/{duyuruId}
  kresId
  sinifId
  baslik
  icerik
  hedefRol
  olusturanRol
  createdAt
```

---

## Yemek Listeleri

```txt
yemekListeleri/{listeId}
  kresId
  sinifId
  tip: gunluk / haftalik / aylik
  baslik
  tarih
  baslangicTarihi
  bitisTarihi
  aktif
  ogunler
  createdAt
```

---

## Ödemeler

```txt
odemeler/{odemeId}
  kresId
  cocukId
  veliId
  ay
  yil
  tutar
  durum: odendi / bekliyor / gecikti
  odemeTarihi
  createdAt
```

---

## Ders Programları

```txt
dersProgramlari/{sinifId}
  kresId
  sinifId
  gunler
  createdAt
```

---

## Etkinlikler

```txt
etkinlikler/{etkinlikId}
  kresId
  baslik
  tarih
  saat
  sinifId
  sinifIds
  aciklama
  aktif
  createdAt
```

---

## Mesajlaşma

Mesajlaşma iki ana node üzerinden çalışır:

```txt
mesajKonusmalari/
mesajlar/
```

Konuşma ID yapıları:

```txt
admin_{adminId}_veli_{veliId}
admin_{adminId}_ogretmen_{teacherId}
veli_{veliId}_ogretmen_{teacherId}_cocuk_{cocukId}
```

Konuşma meta yapısı:

```txt
mesajKonusmalari/{conversationId}
  id
  tip
  kresId
  adminId
  veliId
  ogretmenId
  hedefId
  hedefRol
  cocukId
  sinifId
  katilimcilar
  roller
  baslik
  sonMesaj
  sonMesajAt
  sonGonderenId
  okunmamisSayac
  sonOkuma
  aktif
  updatedAt
```

Mesaj yapısı:

```txt
mesajlar/{conversationId}/{messageId}
  metin
  gonderenId
  gonderenRol
  createdAt
  okunduBy
```

Mesajlaşma performans mantığı:

- Sohbet detayı ilk açılışta son 20 mesajı çeker.
- 20’den fazla mesaj varsa “Daha fazla mesaj yükle” butonu görünür.
- Açık sohbet ekranında yeni mesajlar listener ile canlı düşer.
- Sohbete giren kullanıcı için `okunmamisSayac/{userId}` sıfırlanır.
- Mesaj gönderilince diğer katılımcıların okunmamış sayacı artırılır.
- Konuşma listelerinde okunmamış mesaj badge’i gösterilir.

Mesaj index yapısı:

```txt
kullaniciKonusmalari/{userId}/{conversationId}: true
kresKonusmalari/{kresId}/{conversationId}: true
cocukKonusmalari/{cocukId}/{conversationId}: true
sinifKonusmalari/{sinifId}/{conversationId}: true
```

---

## Abonelik / Demo / Promo

Başlangıç fiyatlandırması:

```txt
İlk 1 ay ücretsiz
Aylık: 1.000 TL
Yıllık: 10.000 TL
```

Firebase node yapısı:

```txt
abonelikler/{kresId}
  kresId
  plan: demo / aylik / yillik
  durum: demo / aktif / pasif
  baslangicTarihi
  bitisTarihi
  demoBitisTarihi
  fiyat
  paraBirimi
  kaynak
  promoKod
  revenueCatCustomerId
  revenueCatEntitlement
  createdAt
  updatedAt
```

Abonelik guard mantığı:

- `superadmin` abonelikten etkilenmez.
- `yonetici` abonelik yok/bitti/pasif ise abonelik/ödeme ekranına yönlenir.
- `ogretmen` abonelik yok/bitti/pasif ise kilit ekranı görür.
- `veli` abonelik yok/bitti/pasif ise kilit ekranı görür.
- `demo` veya `aktif` abonelikte paneller normal açılır.

Promo yapısı:

```txt
promosyonKodlari/{kod}
  kod
  tip
  sureAy
  aktif
  maksimumKullanim
  kullanimSayisi
  createdAt
```

Promo kullanım kaydı:

```txt
promosyonKullanimlari/{kresId}_{kod}
  kresId
  kod
  kullaniciId
  kullanildiAt
  verilenAy
```

Varsayılan pilot kodlar:

```txt
PILOT1AY  -> 1 ay demo
PILOT3AY  -> 3 ay demo
KRES2026  -> 3 ay demo
```

RevenueCat ileride entegre edilecektir.

Önerilen RevenueCat ürün ID’leri:

```txt
yumurcak_aylik
yumurcak_yillik
```

Önerilen entitlement:

```txt
premium
```

---

## Profil Fotoğrafı

Veli profil fotoğrafı Firebase Storage’a yüklenir.

Storage yolu:

```txt
profilFotograflari/veliler/{parentId}.jpg
```

Realtime Database kaydı:

```txt
kullanicilar/{parentId}/profilFotoUrl
```

Veli profil ekranında:

- Galeriden fotoğraf seçme
- Firebase Storage’a yükleme
- URL ile fotoğraf ekleme
- Fotoğraf kaldırma

özellikleri bulunur.

---

## Firebase Auth Geçişi

Proje şu anda Firebase Auth’a hibrit geçiş sistemine sahiptir.

Login akışı:

```txt
1. Kullanıcı adı alınır
2. kullanıcıAdı@yumurcak.local formatında email üretilir
3. Firebase Auth ile giriş denenir
4. Auth başarılıysa authKullaniciIndex üzerinden eski kullanıcı kaydı bulunur
5. Auth başarısızsa eski RTDB kullanıcı adı/şifre sistemi fallback olarak çalışır
```

Bu sayede geçiş sırasında uygulama kilitlenmez.

Auth geçiş ekranı yönetici panelindedir:

```txt
Yönetici Paneli > Firebase Auth Geçişi
```

Auth geçiş ekranı şunları yapar:

- `authUid` olmayan kullanıcıları listeler
- Firebase Auth hesabı oluşturur
- Kullanıcıya `authUid` yazar
- `authKullaniciIndex/{authUid}` kaydı oluşturur
- Log gösterir

Önemli:

Firebase Auth en az 6 karakter şifre ister. Şifresi 6 karakterden kısa olan kullanıcılar Auth geçişinde atlanır.

Production rules uygulanmadan önce tüm aktif kullanıcıların Firebase Auth’a geçmiş olması gerekir.

---

## Firebase Rules

Rules dosyaları:

```txt
firebase/database.rules.pilot.json
firebase/database.rules.transition-auth-test.json
firebase/database.rules.production-auth-v2-fixed.json
firebase/storage.rules.pilot
firebase/storage.rules.production-auth-v2.rules
```

Güvenli uygulama sırası:

```txt
1. Pilot testlerde database.rules.pilot.json kullanılabilir.
2. Auth geçişi sonrası database.rules.transition-auth-test.json ile auth zorunlu test edilir.
3. Tüm roller Firebase Auth ile çalışıyorsa database.rules.production-auth-v2-fixed.json denenir.
4. Storage için storage.rules.production-auth-v2.rules uygulanır.
```

Production Auth rules için şartlar:

```txt
kullanicilar/{userId}/authUid mevcut olmalı
authKullaniciIndex/{authUid} doğru userId göstermeli
kullanicilar/{userId}/rol doğru olmalı
kullanicilar/{userId}/kresId doğru olmalı
FAZ 17 index migration çalışmış olmalı
```

---

## Test Kullanıcıları

### Süper Admin

```txt
kullaniciAdi: faruk
sifre: faruk123
rol: superadmin
```

### Yönetici

```txt
kullaniciAdi: admin
sifre: abc123
rol: yonetici
kresId: kres001
```

### Öğretmen

```txt
kullaniciAdi: ogretmen
sifre: abc123
rol: ogretmen
kresId: kres001
sinifId: sinif001
```

### Veli

```txt
kullaniciAdi: veli
sifre: abc123
rol: veli
kresId: kres001
```

---

## Kurulum

```bash
git clone https://github.com/furukcell/Yumurcak-app.git
cd Yumurcak-app
npm install --legacy-peer-deps
npx expo start --clear
```

---

## Android Build

Codemagic build akışı:

```bash
npm install --legacy-peer-deps
npx expo prebuild --clean --platform android
cd android
chmod +x gradlew
./gradlew assembleRelease
```

APK çıktısı:

```txt
android/app/build/outputs/apk/release/*.apk
```

Notlar:

- Codemagic’te **Build branch: main** seçilmelidir.
- Eski commit seçilirse eski hatalar tekrar görülebilir.
- Build almadan önce son commit’in GitHub’a gittiği kontrol edilmelidir.

---

## Build Öncesi Kontrol Listesi

Build almadan önce şu kontroller yapılmalıdır:

```txt
1. npm install --legacy-peer-deps çalışmalı
2. npx expo start --clear ile uygulama açılmalı
3. Firebase config doğru olmalı
4. Firebase Realtime Database bağlantısı çalışmalı
5. Firebase Storage bağlantısı çalışmalı
6. Superadmin giriş yapmalı
7. Yönetici paneli açılmalı
8. Öğretmen paneli açılmalı
9. Veli paneli açılmalı
10. Yeni kreş oluşturma test edilmeli
11. Abonelik guard test edilmeli
12. Günlük rapor test edilmeli
13. Yoklama test edilmeli
14. Duyuru test edilmeli
15. Yemek listesi test edilmeli
16. Etkinlik test edilmeli
17. Mesajlaşma test edilmeli
18. Okundu / okunmamış mesaj badge test edilmeli
19. Daha fazla mesaj yükle test edilmeli
20. Profil fotoğraf yükleme test edilmeli
21. Firebase Auth migration test edilmeli
22. Firebase index migration test edilmeli
23. Çıkış / tekrar giriş test edilmeli
```

---

## Çözülen Büyük Teknik Sorunlar

- Firebase config / API key hataları giderildi.
- Android release APK JS bundle sorunu giderildi.
- `main has not been registered` hatası çözüldü.
- `index.js` ve `registerRootComponent` akışı düzeltildi.
- `package.json` içindeki `main` alanı `index.js` yapıldı.
- Firebase login şifre karşılaştırması düzeltildi.
- Kullanıcı adı / şifre input normalize edildi.
- Codemagic release APK üretimi çalışır hale getirildi.
- Öğretmen listesi `kullanicilar` node’undan okunacak şekilde düzeltildi.
- Veli ve çocuk listeleri ilişki bilgileriyle zenginleştirildi.
- Veli / öğretmen / yönetici mesajlaşma altyapısı eklendi.
- Mesaj input tıklanmama sorunu düzeltildi.
- Mesajlarda son 20 + daha fazla yükle + okundu bildirimi eklendi.
- Firebase Storage profil fotoğrafı desteği eklendi.
- Firebase Auth hibrit geçiş altyapısı eklendi.
- SuperAdmin panel eklendi.
- Yeni kreş onboarding eklendi.
- Abonelik guard / kilitleme eklendi.
- Firebase index migration ekranı eklendi.

---

## Tamamlanan Fazlar

### FAZ 1 — Mesajlaşma

- Veli - öğretmen mesajlaşması
- Ortak mesaj detay ekranı
- Firebase `mesajKonusmalari` ve `mesajlar` yapısı

### FAZ 2 — Yoklama ve Günlük Rapor

- Öğretmen yoklama ekranı
- Günlük rapor ekranı
- Veli günlük rapor görüntüleme
- Veli yoklama geçmişi
- Detaylı yemek durumu

### FAZ 3 — Duyuru / Etkinlik / Yemek

- Öğretmen duyuru oluşturabilir
- Veli duyuruları görebilir
- Öğretmen etkinlik oluşturabilir
- Veli etkinlikleri görebilir
- Öğretmen yemek listesi girebilir
- Veli yemek listesini görebilir

### FAZ 4 — Kurum Bilgileri ve Profil

- Yönetici kurum bilgilerini düzenleyebilir
- Veli kurum iletişim bilgilerini görebilir
- Profil URL alanı eklendi

### FAZ 5 — Abonelik / Ödeme / Promo

- İlk 1 ay ücretsiz demo
- Aylık 1.000 TL
- Yıllık 10.000 TL
- Promo kod sistemi
- RevenueCat hazırlık alanı

### FAZ 6 — Kreş Adı / Safe Area

- Panellerde kreş adı görünür
- Yumurcak marka alt başlık olarak kalır
- Safe area düzenlemesi yapıldı

### FAZ 7 — Admin Mesajlaşma

- Yönetici velilerle mesajlaşabilir
- Yönetici öğretmenlerle mesajlaşabilir
- Veli kurum yönetimiyle mesajlaşabilir
- Öğretmen kurum yönetimiyle mesajlaşabilir

### FAZ 8 — Profil Fotoğrafı

- Veli galeriden fotoğraf seçebilir
- Firebase Storage’a yüklenir
- Profil URL’i kullanıcı kaydına yazılır

### FAZ 9 — Firebase Rules

- Pilot rules hazırlandı
- Production Auth rules taslağı hazırlandı
- Storage rules hazırlandı

### FAZ 10 — Firebase Auth Geçişi

- Firebase Auth login desteği eklendi
- Eski RTDB login fallback korundu
- Auth migration ekranı eklendi
- authUid / authKullaniciIndex eşleme sistemi kuruldu

### FAZ 11 — Admin UI + Logout Fix

- Admin dashboard ve migration ekranı sadeleştirildi
- Header karışıklığı giderildi
- Çıkış sonrası tekrar otomatik giriş / iki kez çıkış sorunu düzeltildi

### FAZ 12 — Mesaj Input Fix

- Mesaj yazma alanına tıklanmama sorunu düzeltildi
- KeyboardAvoidingView ve input focus akışı düzenlendi

### FAZ 13 — Süper Admin Panel

- Platform sahibi paneli eklendi
- Kreş, öğrenci, öğretmen, veli istatistikleri eklendi
- Abonelik durumları ve il/ilçe dağılımı eklendi
- Kreş detay ekranı eklendi

### FAZ 14 — Süper Admin Kreş Onboarding

- Yeni kreş ekleme ekranı eklendi
- Kurum yöneticisi oluşturma eklendi
- Demo abonelik başlatma eklendi

### FAZ 15 — Abonelik Guard / Kilitleme

- Abonelik aktif/demo ise paneller açık
- Abonelik yok/bitti/pasif ise yönetici ödeme ekranına düşer
- Öğretmen/veli kilit ekranı görür
- Superadmin abonelikten etkilenmez

### FAZ 16 — Mesajlaşma Performans + Okundu

- Son 20 mesaj çekme
- Daha fazla mesaj yükle
- Okundu / gönderildi göstergesi
- Okunmamış mesaj badge sistemi
- Konuşma listelerinde unread sayaç

### FAZ 17 — Firebase Index / Veri Düzeni

- Kreş bazlı index node’ları eklendi
- Kullanıcı, çocuk, sınıf ve mesaj indexleri eklendi
- SuperAdmin index migration ekranı eklendi

### FAZ 18 — Production Rules / Güvenlik Hazırlığı

- Transition auth test rules hazırlandı
- Production auth v2 fixed rules hazırlandı
- Storage production rules hazırlandı
- Uygulama sırası ve dikkat notları belirlendi

---

## Yol Haritası

Yol haritası ayrı dosyada tutulur:

```txt
YOL_HARITASI.md
```

---

## Şimdilik Yapılmayacaklar

- Web panel
- RevenueCat aktif ödeme
- Push notification / bildirim sistemi
- Çoklu ülke / dil desteği
- Muhasebe entegrasyonu
- E-fatura entegrasyonu
- Gelişmiş raporlama / grafik paneli
- App Store yayını

---

## Ürün Konumlandırması

Yumurcak Kreş, küçük ve orta ölçekli kreşler için sade, anlaşılır ve hızlı kullanılabilir bir dijital iletişim ve takip aracıdır.

Değer önerisi:

> Veliler çocuklarının günlük durumunu düzenli takip eder, kreşler daha profesyonel ve güvenilir görünür.

Başlangıç fiyatlandırması:

```txt
İlk 1 ay ücretsiz
Aylık: 1.000 TL
Yıllık: 10.000 TL
```

---

## Geliştirici

**Faruk Kurtuluş**

GitHub: [furukcell](https://github.com/furukcell)

---

## Durum

Proje aktif geliştirme / MVP stabilizasyon aşamasındadır.

Kısa karar:

> Yumurcak artık fikir aşamasını geçmiş, çalışan MVP + SaaS altyapısı seviyesine gelmiş bir kreş yönetim uygulamasıdır. Pilot kreş demosuna hazırlanabilir; ancak ücretli müşteri öncesi gerçek cihaz testleri ve Firebase Auth/Rules geçişi dikkatli tamamlanmalıdır.
