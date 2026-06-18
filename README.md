# Yumurcak Kreş

**Yumurcak Kreş**, kreşler, öğretmenler ve veliler arasındaki günlük iletişimi dijitalleştirmek için geliştirilen mobil bir takip uygulamasıdır.

Uygulama ile öğretmenler çocuklara günlük rapor girebilir, veliler çocuklarının günlük durumunu takip edebilir, kreş yöneticileri ise sınıf, çocuk, öğretmen, veli ve duyuru yönetimini tek yerden yapabilir.

**Expo SDK 53 + React Native + Firebase Realtime Database** altyapısı üzerine kuruludur.

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
| `veli` | Sadece kendi çocuğunun raporlarını görüntüler. |

---

## MVP Akışı

Uygulamanın ilk hedefi aşağıdaki temel akışı hatasız çalıştırmaktır:

1. Yönetici giriş yapar.
2. Sınıf oluşturur.
3. Öğretmen ekler ve sınıfa atar.
4. Veli ekler.
5. Çocuk ekler, sınıfa ve veliye bağlar.
6. Öğretmen giriş yapar.
7. Kendi sınıfındaki çocukları görür.
8. Çocuk için günlük rapor girer.
9. Veli giriş yapar.
10. Kendi çocuğunu görür.
11. Günlük raporu görüntüler.

Bu akış tamamlanmadan yeni büyük özellik eklenmemesi hedeflenmiştir.

---

## Temel Özellikler

### Rol Bazlı Giriş

Kullanıcılar sisteme kullanıcı adı ve şifre ile giriş yapar. Giriş yapan kullanıcının rolüne göre uygulama otomatik olarak ilgili panele yönlendirilir.

Desteklenen roller:

- `yonetici`
- `ogretmen`
- `veli`

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

### Günlük Rapor Sistemi

Günlük raporlar uygulamanın ana özelliğidir.

Öğretmen, çocuk için şu bilgileri rapora ekleyebilir:

- Ruh hali
- Yemek bilgisi
- Uyku süresi
- Tuvalet sayısı
- Öğretmen notu
- Tarih

Raporlar Firebase Realtime Database üzerinde saklanır ve veli panelinde çocuğa bağlı şekilde listelenir.

### Veli Paneli

Veli giriş yaptığında sadece kendisine bağlı çocukları görür.

Veli bir çocuğu seçtiğinde o çocuğa ait günlük raporları görüntüleyebilir.

Raporda şu bilgiler gösterilir:

- Tarih
- Ruh hali
- Yemek durumu
- Uyku süresi
- Tuvalet bilgisi
- Öğretmen notu

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

- Expo SDK 53
- React Native
- JavaScript
- Firebase Realtime Database
- AsyncStorage
- React Navigation
- Expo Notifications

> Not: Firebase Auth üretim öncesi teknik borç olarak planlanmıştır. Mevcut MVP aşamasında kullanıcı adı / şifre kontrolü Firebase Realtime Database üzerinden yapılmaktadır.

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
    "kullaniciAdi": "ogretmen1",
    "sifre": "123456",
    "ad": "Ayşe Yılmaz",
    "rol": "ogretmen",
    "kresId": "default-kres",
    "sinifId": "sinifId",
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
  "default-kres": {
    "ad": "Yumurcak Kreş",
    "adminIds": ["adminUid"]
  }
}
```

### `siniflar`

Sınıf bilgilerini tutar.

```json
{
  "sinifId": {
    "ad": "Minikler",
    "yasGrubu": "3-4 yaş",
    "kresId": "default-kres",
    "ogretmenIds": ["ogretmenUid"],
    "createdAt": 1780000000000
  }
}
```

### `cocuklar`

Çocuk kayıtlarını tutar.

```json
{
  "cocukId": {
    "ad": "Zeynep",
    "dogumTarihi": "2023-05-19",
    "sinifId": "sinifId",
    "kresId": "default-kres",
    "veliIds": ["veliUid"],
    "createdAt": 1780000000000
  }
}
```

### `gunlukRaporlar`

Çocuklara ait günlük raporları tutar.

```json
{
  "raporId": {
    "cocukId": "cocukId",
    "sinifId": "sinifId",
    "kresId": "default-kres",
    "ogretmenId": "ogretmenUid",
    "tarih": "2026-06-06",
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
  "duyuruId": {
    "baslik": "Yarın etkinlik var",
    "mesaj": "Çocuklarımız için bahçe etkinliği yapılacaktır.",
    "kresId": "default-kres",
    "gonderenId": "adminUid",
    "oncelik": "normal",
    "hedefRol": "all",
    "createdAt": 1780000000000
  }
}
```

---

## Proje Yapısı

Güncel proje yapısı aşağıdaki gibi hedeflenmiştir:

```txt
Yumurcak-app/
├── App.js
├── app.json
├── package.json
├── eas.json
├── codemagic.yaml
├── database.rules.json
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
    │   │   ├── DashboardScreen.js
    │   │   ├── ClassListScreen.js
    │   │   ├── ClassFormScreen.js
    │   │   ├── ChildListScreen.js
    │   │   ├── ChildFormScreen.js
    │   │   ├── TeacherListScreen.js
    │   │   ├── TeacherFormScreen.js
    │   │   ├── VeliListScreen.js
    │   │   ├── VeliFormScreen.js
    │   │   ├── AnnouncementListScreen.js
    │   │   └── AnnouncementFormScreen.js
    │   ├── teacher/
    │   │   ├── TeacherDashboardScreen.js
    │   │   └── ChildReportScreen.js
    │   └── parent/
    │       ├── ParentDashboard.js
    │       └── ChildReportScreen.js
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
npm install
npx expo start --clear
```

---

## Build

Android production build için EAS production profili kullanılır.

```bash
eas build --platform android --profile production --non-interactive
```

Production profili Android tarafında **AAB** üretir.

---

## Ortam Değişkenleri

Kök dizine `.env` dosyası oluşturulmalıdır.

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://yumurcak-app-default-rtdb.europe-west1.firebasedatabase.app
```

> `.env` dosyası `.gitignore` içine eklenmiş olmalıdır.

---

## Test Kullanıcıları

Bu kullanıcılar Firebase Realtime Database içinde `kullanicilar/` node’una manuel olarak eklenebilir.

### Yönetici

```txt
kullaniciAdi: admin
sifre: 123456
ad: Kreş Müdürü
rol: yonetici
kresId: default-kres
```

### Öğretmen

```txt
kullaniciAdi: ogretmen1
sifre: 123456
ad: Ayşe Yılmaz
rol: ogretmen
kresId: default-kres
sinifId: sinifId
```

### Veli

```txt
kullaniciAdi: veli1
sifre: 123456
ad: Mehmet Yılmaz
rol: veli
kresId: default-kres
```

> Bu kullanıcılar sadece MVP / pilot test içindir.

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

## Bildirim Sistemi

Uygulamada Expo Notifications altyapısı planlanmıştır.

Bildirimlerin kullanım alanları:

- Günlük rapor girildiğinde veliye bildirim
- Yeni duyuru yayınlandığında velilere bildirim
- Acil duyuruların öne çıkarılması

MVP aşamasında bildirim sistemi pasif veya sınırlı çalışabilir. Bildirim kodları uygulamayı çökertmeyecek şekilde güvenli çalışmalıdır.

Push token bilgisi kullanıcı altında tutulmalıdır:

```txt
kullanicilar/{uid}/pushToken
```

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

## Teknik Borçlar

- [ ] Firebase Auth’a geçiş
- [ ] Düz metin şifre kullanımının kaldırılması
- [ ] Firebase Database Rules üretim için güçlendirilmesi
- [ ] Bildirim sisteminin gerçek Expo Project ID ile aktif edilmesi
- [ ] Çoklu kreş desteğinin güvenli hale getirilmesi
- [ ] `kresId` bazlı veri izolasyonunun tüm ekranlarda zorunlu yapılması
- [ ] Yönetici ekranlarında eksik CRUD işlemlerinin tamamlanması
- [ ] UI / UX sadeleştirme ve gerçek cihaz testi
- [ ] Codemagic / EAS build testleri
- [ ] Play Store kapalı test hazırlığı

---

## MVP Test Senaryosu

Uygulama market veya kapalı test öncesi aşağıdaki akışı hatasız tamamlamalıdır:

1. Uygulama açılır.
2. Login ekranı gelir.
3. Yönetici giriş yapar.
4. Sınıf oluşturur.
5. Öğretmen oluşturur.
6. Veli oluşturur.
7. Çocuk oluşturur.
8. Çocuk sınıfa bağlanır.
9. Çocuk veliye bağlanır.
10. Öğretmen sınıfa bağlanır.
11. Yönetici çıkış yapar.
12. Öğretmen giriş yapar.
13. Kendi sınıfındaki çocuğu görür.
14. Çocuk için günlük rapor girer.
15. Öğretmen çıkış yapar.
16. Veli giriş yapar.
17. Kendi çocuğunu görür.
18. Günlük raporu görüntüler.

Bu 18 adım çalışmadan yeni büyük özellik eklenmemelidir.

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

Proje aktif geliştirme / MVP toparlama aşamasındadır.

Öncelikli hedef:

> Öğretmen çocuk için günlük rapor girsin, veli kendi telefonundan o raporu görsün.

Bu temel akış stabil hale geldikten sonra bildirim, ödeme, gelişmiş rapor, çoklu kreş ve web yönetim paneli gibi özellikler değerlendirilecektir.
