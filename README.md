# Yumurcak Kreş

**Yumurcak Kreş**, kreş yönetimi, öğretmen ve veli arasındaki günlük iletişimi dijitalleştirmek için geliştirilen mobil takip uygulamasıdır.

Uygulama ile:

- Yönetici sınıf, çocuk, öğretmen, veli ve duyuru yönetimi yapabilir.
- Öğretmen kendi sınıfındaki çocuklar için günlük rapor girebilir.
- Veli sadece kendisine bağlı çocuğun bilgilerini ve raporlarını görebilir.

Proje şu anda **çalışan Android APK / MVP test aşamasındadır**.

---

## Güncel Durum

Son testlerde ulaşılan durum:

- Android APK başarıyla açılıyor.
- Firebase Realtime Database bağlantısı çalışıyor.
- Kullanıcı adı / şifre ile giriş çalışıyor.
- Rol bazlı yönlendirme çalışıyor.
- Yönetici hesabı ile yönetici paneline giriş yapılıyor.
- Yönetici panelindeki ana kartlar açılıyor:
  - Sınıflar
  - Çocuklar
  - Öğretmenler
  - Veliler
  - Duyurular
- Veli hesabı ile giriş yapılabiliyor.
- Veli hesabının çocuk görebilmesi için çocuğun `veliIds` alanına veli ID'sinin bağlanması gerektiği doğrulandı.
- Codemagic üzerinden release APK alınabiliyor.
- Expo / Firebase / Metro / Android açılış hataları giderildi.

Henüz tamamlanmamış alanlar:

- Bazı ekranlarda geri / çıkış butonu eksikleri var.
- Veli ve öğretmen tarafında boş veri durumları daha kullanıcı dostu hale getirilmeli.
- Tüm CRUD akışları tek tek gerçek cihazda test edilmeli.
- UI/UX tarafında buton, loading, boş ekran ve hata mesajı düzenlemeleri yapılmalı.

---

## Proje Amacı

Kreşlerde velilerin en çok merak ettiği konular genellikle şunlardır:

- Çocuğum bugün nasıldı?
- Yemek yedi mi?
- Uyudu mu?
- Tuvalet durumu nasıldı?
- Öğretmen bir not bıraktı mı?
- Kreşten önemli bir duyuru var mı?

Yumurcak Kreş, bu bilgileri WhatsApp grupları veya dağınık manuel yöntemler yerine daha düzenli, takip edilebilir ve rol bazlı çalışan bir sisteme taşımayı hedefler.

Temel amaç:

> Kreş ile veli arasındaki günlük iletişimi daha düzenli, güvenli ve takip edilebilir hale getirmek.

---

## Kullanıcı Rolleri

| Rol | Açıklama |
|---|---|
| `yonetici` | Kreş müdürü / kreş yönetimi. Sınıf, çocuk, öğretmen, veli ve duyuru yönetimini yapar. |
| `ogretmen` | Kendi sınıfındaki çocuklar için günlük rapor girer. |
| `veli` | Sadece kendisine bağlı çocuğun raporlarını görüntüler. |

---

## MVP Akışı

Uygulamanın ilk hedefi aşağıdaki temel akışı hatasız çalıştırmaktır:

1. Yönetici giriş yapar.
2. Sınıf oluşturur.
3. Öğretmen ekler ve sınıfa atar.
4. Veli ekler.
5. Çocuk ekler.
6. Çocuğu sınıfa bağlar.
7. Çocuğu veliye bağlar.
8. Öğretmen giriş yapar.
9. Kendi sınıfındaki çocukları görür.
10. Çocuk için günlük rapor girer.
11. Veli giriş yapar.
12. Kendisine bağlı çocuğu görür.
13. Günlük raporu görüntüler.

Bu akış stabil hale gelmeden yeni büyük özellik eklenmemelidir.

---

## Temel Özellikler

### Rol Bazlı Giriş

Kullanıcılar sisteme kullanıcı adı ve şifre ile giriş yapar. Giriş yapan kullanıcının rolüne göre uygulama otomatik olarak ilgili panele yönlendirilir.

Desteklenen roller:

- `yonetici`
- `ogretmen`
- `veli`

MVP aşamasında giriş sistemi Firebase Realtime Database üzerinden yapılmaktadır. Firebase Auth üretim öncesi teknik borç olarak planlanmıştır.

### Yönetici Paneli

Yönetici paneli kreşin temel yönetim alanıdır.

Yönetici şu işlemleri yapabilir:

- Sınıf oluşturma ve listeleme
- Öğretmen ekleme ve sınıfa atama
- Veli ekleme
- Çocuk ekleme
- Çocuğu sınıfa bağlama
- Çocuğu veliye bağlama
- Duyuru oluşturma ve listeleme

### Öğretmen Paneli

Öğretmen panelinde öğretmen kendi sınıfındaki çocukları görür.

Öğretmen bir çocuğu seçerek günlük rapor ekranına geçer ve çocuğun gün içindeki temel bilgilerini girer.

### Veli Paneli

Veli giriş yaptığında sadece kendisine bağlı çocukları görür.

Veli tarafında çocuğun görünmesi için çocuk kaydında şu ilişki bulunmalıdır:

```txt
cocuklar/{cocukId}/veliIds: ["veliUid"]
```

Bu bağlantı yoksa veli panelinde çocuk bulunamaz.

### Günlük Rapor Sistemi

Öğretmen, çocuk için şu bilgileri rapora ekleyebilir:

- Ruh hali
- Yemek bilgisi
- Uyku süresi
- Tuvalet sayısı
- Öğretmen notu
- Tarih

Raporlar Firebase Realtime Database üzerinde saklanır ve veli panelinde çocuğa bağlı şekilde listelenir.

### Duyuru Sistemi

Yönetici panelinden duyuru oluşturulabilir.

Duyurular şu amaçlarla kullanılabilir:

- Genel bilgilendirme
- Acil duyuru
- Etkinlik haberi
- Tatil veya çalışma düzeni bilgilendirmesi
- Veliye toplu bilgilendirme

---

## Teknolojiler

Projede kullanılan temel teknolojiler:

- Expo SDK 54
- React Native
- JavaScript
- Firebase Realtime Database
- AsyncStorage
- React Navigation
- Expo Notifications
- Codemagic Android APK build

---

## Firebase Veri Modeli

Uygulama Firebase Realtime Database üzerinde aşağıdaki temel node yapısını kullanır.

```txt
kullanicilar/
kresler/
siniflar/
cocuklar/
gunlukRaporlar/
duyurular/
```

### `kullanicilar`

Giriş yapan kullanıcıların temel bilgilerini tutar.

```json
{
  "uid": {
    "kullaniciAdi": "ogretmen",
    "sifre": "abc123",
    "ad": "Ayşe Öğretmen",
    "rol": "ogretmen",
    "aktif": true,
    "kresId": "kres001",
    "sinifId": "sinif001",
    "telefon": "",
    "pushToken": "",
    "createdAt": 1780000000000
  }
}
```

Kullanılabilecek roller:

```txt
yonetici
ogretmen
veli
```

### `kresler`

Kreş bilgilerini ve yönetici ilişkilerini tutar.

```json
{
  "kres001": {
    "ad": "Yumurcak Kreş",
    "adres": "Test Mahallesi",
    "telefon": "5001234567",
    "yoneticiId": "testuid001"
  }
}
```

### `siniflar`

Sınıf bilgilerini tutar.

```json
{
  "sinif001": {
    "ad": "Minikler",
    "yasGrubu": "3-4 yaş",
    "kresId": "kres001",
    "ogretmenIds": ["ogretmen001"],
    "createdAt": 1780000000000
  }
}
```

### `cocuklar`

Çocuk kayıtlarını tutar.

```json
{
  "cocuk001": {
    "ad": "Zeynep",
    "dogumTarihi": "2023-05-19",
    "sinifId": "sinif001",
    "kresId": "kres001",
    "veliIds": ["veli001"],
    "createdAt": 1780000000000
  }
}
```

### `gunlukRaporlar`

Çocuklara ait günlük raporları tutar.

```json
{
  "rapor001": {
    "cocukId": "cocuk001",
    "sinifId": "sinif001",
    "kresId": "kres001",
    "ogretmenId": "ogretmen001",
    "tarih": "2026-06-20",
    "ruhHali": "Mutlu",
    "yemek": {
      "kahvalti": true,
      "ogle": true,
      "araOgun": false
    },
    "uyku": {
      "sure": 2,
      "not": ""
    },
    "tuvalet": {
      "sayi": 3,
      "not": ""
    },
    "not": "Bugün çok neşeliydi.",
    "createdAt": 1780000000000
  }
}
```

### `duyurular`

Yönetici tarafından gönderilen duyuruları tutar.

```json
{
  "duyuru001": {
    "baslik": "Yarın etkinlik var",
    "mesaj": "Çocuklarımız için bahçe etkinliği yapılacaktır.",
    "kresId": "kres001",
    "gonderenId": "adminUid",
    "oncelik": "normal",
    "hedefRol": "all",
    "createdAt": 1780000000000
  }
}
```

---

## Test Kullanıcıları

Firebase Realtime Database içinde `kullanicilar/` node’una manuel olarak eklenebilir veya yönetici panelinden oluşturulabilir.

### Yönetici

```txt
uid: testuid001
kullaniciAdi: admin
sifre: abc123
ad: Test
soyad: Yonetici
rol: yonetici
aktif: true
kresId: kres001
```

### Öğretmen

```txt
uid: ogretmen001
kullaniciAdi: ogretmen
sifre: abc123
ad: Ayse Ogretmen
rol: ogretmen
aktif: true
kresId: kres001
sinifId: sinif001
```

### Veli

```txt
uid: veli001
kullaniciAdi: veli
sifre: abc123
ad: Mehmet Veli
rol: veli
aktif: true
kresId: kres001
```

Veli çocuğu görebilsin diye çocuk kaydında ayrıca şu bağlantı olmalıdır:

```txt
cocuklar/{cocukId}/veliIds: ["veli001"]
```

---

## Proje Yapısı

```txt
Yumurcak-app/
├── App.js
├── index.js
├── app.json
├── package.json
├── codemagic.yaml
├── metro.config.js
├── README.md
└── src/
    ├── constants.js
    ├── config/
    │   └── firebase.js
    ├── context/
    │   └── AuthContext.js
    ├── navigation/
    │   ├── RootNavigator.js
    │   ├── AuthStack.js
    │   ├── AdminStack.js
    │   ├── TeacherStack.js
    │   └── ParentStack.js
    ├── screens/
    │   ├── auth/
    │   │   └── LoginScreen.js
    │   ├── admin/
    │   ├── teacher/
    │   └── parent/
    ├── utils/
    │   ├── id.js
    │   └── notifications.js
    └── types/
```

---

## Kurulum

Projeyi yerel ortamda çalıştırmak için:

```bash
git clone https://github.com/furukcell/Yumurcak-app.git
cd Yumurcak-app
npm install --legacy-peer-deps
npx expo start --clear
```

---

## Android Build

Mevcut APK build süreci Codemagic üzerinden yapılmaktadır.

Codemagic akışı:

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

Önemli not:

- Codemagic’te **Build branch: main** seçilmelidir.
- Eski commit seçilirse önceki hatalar tekrar görülebilir.
- Doğru çalışan APK için son stabil commit ayrıca not edilmelidir.

---

## Çözülen Büyük Teknik Sorunlar

Bu aşamaya kadar çözülen ana problemler:

- Expo SDK yükseltmesi sonrası Firebase Auth başlatma hatası giderildi.
- Firebase API key / config boş gelme sorunu giderildi.
- Android release APK’da JS bundle yüklenmeme sorunu giderildi.
- `main has not been registered` hatası için `index.js` ve `registerRootComponent` akışı düzeltildi.
- `package.json` içinde `main` alanı `index.js` olarak ayarlandı.
- Firebase login tarafında sayı/metin şifre karşılaştırması düzeltildi.
- Kullanıcı adı ve şifre input normalize edildi.
- Codemagic release APK üretimi çalışır hale getirildi.
- Uygulama ikonu `app.json` içine bağlandı.
- TypeScript yazımı kalmış `.js` dosyası temizlendi.

---

## Güncel Test Senaryosu

Uygulama market veya kapalı test öncesi aşağıdaki akışı hatasız tamamlamalıdır:

1. Uygulama açılır.
2. Login ekranı gelir.
3. Yönetici giriş yapar.
4. Sınıf oluşturur.
5. Öğretmen oluşturur.
6. Öğretmen sınıfa bağlanır.
7. Veli oluşturur.
8. Çocuk oluşturur.
9. Çocuk sınıfa bağlanır.
10. Çocuk veliye bağlanır.
11. Yönetici çıkış yapar.
12. Öğretmen giriş yapar.
13. Kendi sınıfındaki çocuğu görür.
14. Çocuk için günlük rapor girer.
15. Öğretmen çıkış yapar.
16. Veli giriş yapar.
17. Kendi çocuğunu görür.
18. Günlük raporu görüntüler.
19. Veli çıkış yapar.

---

## Yol Haritası

### Faz 1 — Stabil MVP

Amaç: Uygulamanın üç rol için çökmeden çalışması.

- [x] Android APK açılışını düzelt
- [x] Firebase bağlantısını çalıştır
- [x] Login akışını çalıştır
- [x] Yönetici panelini açılır hale getir
- [x] Yönetici kartlarını çalıştır
- [x] Veli bağlantı mantığını doğrula
- [ ] Öğretmen hesabı ile sınıf / çocuk görünümünü test et
- [ ] Öğretmen günlük rapor girişini test et
- [ ] Veli günlük rapor görüntülemeyi test et
- [ ] Eksik geri / çıkış butonlarını tamamla
- [ ] Boş veri ekranlarını kullanıcı dostu hale getir
- [ ] Tüm butonlara loading / disabled state ekle
- [ ] Hata mesajlarını sadeleştir

### Faz 2 — Pilot Test Hazırlığı

Amaç: Gerçek kreş demo kullanımına hazır hale getirmek.

- [ ] Demo kreş datası oluştur
- [ ] 1 yönetici, 1 öğretmen, 1 veli, 1 çocuk ile tam demo akışı hazırla
- [ ] Firebase veri yapısını temizle
- [ ] Gereksiz test kayıtlarını sil
- [ ] UI metinlerini sadeleştir
- [ ] Android cihazlarda ekran taşması / buton görünürlüğü testi yap
- [ ] APK dosyasını yedekle

### Faz 3 — Güvenlik ve Üretim Borçları

Amaç: Pilot sonrası daha güvenli yapıya geçmek.

- [ ] Firebase Auth’a geçiş
- [ ] Düz metin şifre kullanımını kaldırma
- [ ] Firebase Database Rules güçlendirme
- [ ] `kresId` bazlı veri izolasyonunu zorunlu hale getirme
- [ ] Yönetici dashboard istatistiklerini `kresId` filtresiyle sayacak hale getirme
- [ ] Veli sadece kendi çocuğunu görebilmeli
- [ ] Öğretmen sadece kendi sınıfındaki çocukları yönetebilmeli
- [ ] Çoklu kreş desteğini güvenli hale getirme

### Faz 4 — MVP Sonrası Özellikler

Bu özellikler MVP stabil hale gelmeden eklenmemelidir:

- Push bildirimleri
- Fotoğraf / video paylaşımı
- Yoklama sistemi
- İlaç / alerji takibi
- Servis takibi
- PDF rapor çıktısı
- Web yönetim paneli
- Ödeme / abonelik sistemi
- Çoklu kreş / SuperAdmin paneli

---

## Güvenlik Notu

Mevcut MVP aşamasında giriş sistemi Firebase Realtime Database üzerindeki kullanıcı adı / şifre karşılaştırması ile çalışmaktadır.

Bu yapı sadece geliştirme ve pilot test içindir.

Üretim öncesinde yapılması gerekenler:

- Firebase Auth’a geçilmeli
- Şifreler düz metin tutulmamalı
- Firebase Database Rules güçlendirilmeli
- Kullanıcılar sadece kendi `kresId` alanına bağlı verileri görebilmeli
- Veli sadece kendi çocuğunun raporlarını görebilmeli
- Öğretmen sadece kendi sınıfındaki çocukların raporlarını yönetebilmeli

---

## Pasif Bırakılan Özellikler

Aşağıdaki özellikler MVP sonrasına bırakılmıştır:

- Mesajlaşma
- Fotoğraf / video gönderme
- Yoklama sistemi
- İlaç / alerji takibi
- Servis takibi
- PDF rapor çıktısı
- Ödeme / abonelik sistemi
- Çoklu kreş / SuperAdmin paneli
- Web yönetim paneli
- Yapay zekâ destekli rapor analizi

---

## Ürün Konumlandırması

Yumurcak Kreş, küçük ve orta ölçekli kreşler için sade, anlaşılır ve hızlı kullanılabilir bir dijital iletişim aracı olarak konumlandırılabilir.

Değer önerisi:

> Veliler çocuklarının günlük durumunu düzenli takip eder, kreşler daha profesyonel ve güvenilir görünür.

---

## Geliştirici

**Faruk Kurtuluş**

GitHub: [furukcell](https://github.com/furukcell)

---

## Durum

Proje aktif geliştirme / MVP stabilizasyon aşamasındadır.

Öncelikli hedef:

> Yönetici sınıf-öğretmen-veli-çocuk ilişkisini kursun, öğretmen günlük rapor girsin, veli kendi telefonundan o raporu görsün.

Bu temel akış stabil hale geldikten sonra bildirim, ödeme, gelişmiş rapor, çoklu kreş ve web yönetim paneli gibi özellikler değerlendirilecektir.
