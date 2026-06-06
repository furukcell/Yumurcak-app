# Yumurcak Kreş

**Yumurcak Kreş**, kreşler, öğretmenler ve veliler arasındaki günlük iletişimi dijitalleştirmek için geliştirilen mobil bir takip uygulamasıdır. Uygulama; çocukların günlük durum raporlarının tutulması, velilere anlık bilgi akışı sağlanması, sınıf/çocuk/öğretmen yönetimi yapılması ve duyuruların merkezi şekilde paylaşılması amacıyla tasarlanmıştır.

Proje; **Expo**, **React Native** ve **Firebase Realtime Database** altyapısı üzerine kuruludur. Mobil öncelikli yapısıyla hem Android hem iOS tarafında çalışabilecek şekilde geliştirilmiştir.

---

## İçindekiler

- [Proje Hakkında](#proje-hakkında)
- [Temel Amaç](#temel-amaç)
- [Kullanıcı Rolleri](#kullanıcı-rolleri)
- [Özellikler](#özellikler)
- [Uygulama Akışı](#uygulama-akışı)
- [Teknolojiler](#teknolojiler)
- [Proje Yapısı](#proje-yapısı)
- [Firebase Veri Yapısı](#firebase-veri-yapısı)
- [Kurulum](#kurulum)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Çalıştırma](#çalıştırma)
- [Bildirim Sistemi](#bildirim-sistemi)
- [Güvenlik ve Yetkilendirme](#güvenlik-ve-yetkilendirme)
- [Geliştirme Notları](#geliştirme-notları)
- [Yol Haritası](#yol-haritası)
- [Lisans](#lisans)

---

## Proje Hakkında

Yumurcak Kreş, kreşlerde gün içinde yaşanan bilgilerin velilere düzenli ve anlaşılır şekilde aktarılmasını hedefleyen bir mobil uygulamadır.

Kreşlerde velilerin en çok merak ettiği konular genellikle şunlardır:

- Çocuğum bugün nasıldı?
- Yemek yedi mi?
- Uyudu mu?
- Tuvalet durumu nasıldı?
- Öğretmen bir not bıraktı mı?
- Kreşten önemli bir duyuru var mı?

Yumurcak Kreş bu ihtiyaçları tek bir uygulama içinde toplar. Öğretmenler çocuklara günlük rapor girebilir, veliler çocuklarının raporlarını takip edebilir, yöneticiler ise sınıf, çocuk, öğretmen ve duyuru süreçlerini yönetebilir.

---

## Temel Amaç

Bu projenin amacı, kreş–veli iletişimini WhatsApp grupları veya dağınık manuel yöntemlerden çıkarıp daha düzenli, izlenebilir ve rol bazlı çalışan bir sisteme taşımaktır.

Uygulama özellikle şu problemleri çözmeyi hedefler:

- Velilerin çocukları hakkında güncel bilgiye hızlı ulaşması
- Öğretmenlerin günlük raporları standart şekilde girmesi
- Kreş yöneticisinin sınıf ve çocuk organizasyonunu yönetmesi
- Acil veya genel duyuruların velilere tek merkezden iletilmesi
- Çocuk bazlı geçmiş raporların düzenli şekilde saklanması

---

## Kullanıcı Rolleri

Uygulamada üç temel kullanıcı rolü bulunur.

### 1. Yönetici

Kreş yönetiminden sorumlu kullanıcıdır.

Yönetici şu işlemleri yapabilir:

- Sınıf oluşturma ve listeleme
- Çocuk ekleme, düzenleme ve listeleme
- Öğretmenleri görüntüleme
- Duyuru oluşturma ve listeleme
- Kreş içi temel yönetim ekranlarına erişim

### 2. Öğretmen

Kendisine atanmış sınıftaki çocuklarla ilgilenen kullanıcıdır.

Öğretmen şu işlemleri yapabilir:

- Kendi sınıfındaki çocukları görüntüleme
- Çocuk bazlı günlük rapor oluşturma
- Yemek, uyku, tuvalet ve ruh hali bilgisi girme
- Veliye özel not ekleme
- Rapor eklendiğinde veliye bildirim gönderilmesini tetikleme

### 3. Veli

Sistemde kayıtlı çocuğunu takip eden kullanıcıdır.

Veli şu işlemleri yapabilir:

- Kendisine bağlı çocukları görüntüleme
- Çocuğun günlük raporlarını takip etme
- Yemek, uyku, tuvalet, ruh hali ve öğretmen notlarını görüntüleme
- Duyuru ve rapor bildirimlerinden haberdar olma

---

## Özellikler

### Rol Bazlı Giriş Sistemi

Kullanıcılar sisteme kullanıcı adı ve şifre ile giriş yapar. Giriş yapan kullanıcının rolüne göre uygulama otomatik olarak ilgili panele yönlendirilir.

Desteklenen roller:

- `yonetici`
- `ogretmen`
- `veli`

---

### Yönetici Paneli

Yönetici paneli kreşin temel yönetim alanıdır.

Bu panelde şu modüller bulunur:

- **Sınıflar**
- **Çocuklar**
- **Öğretmenler**
- **Duyurular**
- **Hızlı istatistik alanı**

Yönetici, kreşe ait temel veri girişlerini yaparak öğretmen ve veli tarafındaki işleyişin temelini oluşturur.

---

### Sınıf Yönetimi

Sınıflar, çocukların ve öğretmenlerin organize edildiği ana yapılardır.

Sınıf kayıtlarında şu bilgiler tutulabilir:

- Sınıf adı
- Kreş ID
- Öğretmen ID listesi
- Oluşturulma bilgisi

Bu yapı sayesinde öğretmenlerin yalnızca kendilerine atanmış çocukları görmesi hedeflenir.

---

### Çocuk Yönetimi

Yönetici çocuk kaydı oluşturabilir veya mevcut çocuk bilgisini düzenleyebilir.

Çocuk kaydında şu alanlar bulunur:

- Çocuk adı
- Doğum tarihi
- Sınıf ID
- Kreş ID
- Veli ID listesi

Bu yapı sayesinde bir çocuk bir sınıfa ve birden fazla veliye bağlanabilir.

---

### Öğretmen Paneli

Öğretmen paneli, öğretmenin kendi sınıfındaki çocukları görmesini sağlar.

Öğretmen bir çocuğu seçerek günlük rapor ekranına geçer. Bu rapor ekranında çocuğun gün içindeki temel bilgileri girilebilir.

---

### Günlük Rapor Sistemi

Günlük raporlar uygulamanın ana özelliklerinden biridir.

Öğretmen, çocuk için şu bilgileri rapora ekleyebilir:

- Ruh hali
- Yemek bilgisi
- Uyku süresi
- Tuvalet sayısı
- Öğretmen notu
- Oluşturulma tarihi
- Öğretmen ID
- Çocuk ID
- Sınıf ID

Bu raporlar Firebase üzerinde saklanır ve veli panelinde çocuğa bağlı şekilde listelenir.

---

### Veli Paneli

Veli giriş yaptığında kendisine bağlı çocukları görür.

Veli bir çocuğu seçtiğinde o çocuğa ait rapor geçmişini görüntüleyebilir.

Raporda şu bilgiler gösterilir:

- Tarih
- Ruh hali
- Yemek durumu
- Uyku süresi
- Tuvalet bilgisi
- Öğretmen notu

---

### Duyuru Sistemi

Yönetici panelinden duyuru oluşturulabilir.

Duyurular şu amaçlarla kullanılabilir:

- Genel bilgilendirme
- Acil duyuru
- Kreş içi etkinlik haberi
- Tatil veya çalışma düzeni bilgilendirmesi
- Veliye toplu mesaj

Duyurular normal veya acil öncelikli olarak hazırlanabilir.

---

### Push Bildirim Desteği

Uygulamada Expo Notifications altyapısı kullanılarak push bildirim desteği planlanmıştır.

Bildirimlerin kullanım alanları:

- Yeni günlük rapor eklendiğinde veliye bildirim gönderme
- Yeni duyuru yayınlandığında velilere toplu bildirim gönderme
- Acil duyuruları öne çıkarma

---

### Otomatik Oturum Kontrolü

Uygulama açıldığında daha önce giriş yapmış kullanıcı AsyncStorage üzerinden kontrol edilir. Kullanıcı bilgisi kayıtlıysa sistem Firebase üzerinden doğrulama yaparak otomatik oturum açabilir.

---

## Uygulama Akışı

### Genel Akış

1. Kullanıcı uygulamayı açar.
2. Kayıtlı oturum varsa kullanıcı otomatik kontrol edilir.
3. Oturum yoksa giriş ekranı gösterilir.
4. Kullanıcı adı ve şifre ile giriş yapılır.
5. Kullanıcının rolüne göre ilgili panele yönlendirme yapılır.
6. Yönetici, öğretmen veya veli kendi yetkisine uygun ekranları kullanır.

### Rol Bazlı Yönlendirme

- `yonetici` → Yönetici paneli
- `ogretmen` → Öğretmen paneli
- `veli` → Veli paneli

---

## Teknolojiler

Projede kullanılan temel teknolojiler:

- **React Native**
- **Expo**
- **JavaScript**
- **TypeScript**
- **Firebase Realtime Database**
- **Firebase Authentication**
- **Expo Notifications**
- **Expo Secure Store**
- **AsyncStorage**
- **React Navigation**
- **Expo Image Picker**

---

## Proje Yapısı

Aşağıdaki yapı projenin temel organizasyonunu gösterir:

```txt
Yumurcak-app/
├── App.js
├── app.json
├── constants.js
├── database.rules.json
├── package.json
├── eas.json
├── codemagic.yaml
├── screens/
│   ├── AuthScreens.js
│   ├── OgretmenScreen.js
│   ├── VeliScreen.js
│   └── YoneticiScreen.js
└── src/
    ├── components/
    │   ├── Button.js
    │   ├── Card.js
    │   ├── ChildCard.js
    │   ├── Input.js
    │   ├── Loading.js
    │   └── ReportCard.js
    ├── config/
    │   └── firebase.ts
    ├── context/
    │   └── AuthContext.js
    ├── hooks/
    │   ├── useNotificationListener.js
    │   └── useNotifications.js
    ├── navigation/
    │   ├── AdminStack.js
    │   ├── AuthStack.js
    │   ├── ParentStack.js
    │   ├── RootNavigator.js
    │   └── TeacherStack.js
    ├── screens/
    │   ├── admin/
    │   │   ├── AdminDashboard.js
    │   │   ├── AnnouncementFormScreen.js
    │   │   ├── AnnouncementListScreen.js
    │   │   ├── ChildFormScreen.js
    │   │   ├── ChildListScreen.js
    │   │   ├── ClassFormScreen.js
    │   │   ├── ClassListScreen.js
    │   │   └── TeacherListScreen.js
    │   ├── auth/
    │   │   └── LoginScreen.js
    │   ├── parent/
    │   │   ├── ChildReportScreen.js
    │   │   └── ParentDashboard.js
    │   └── teacher/
    │       ├── ChildReportScreen.js
    │       └── TeacherDashboardScreen.js
    ├── types/
    └── utils/
        ├── id.ts
        └── notifications.js
```

---

## Firebase Veri Yapısı

Uygulama Firebase Realtime Database üzerinde aşağıdaki ana veri koleksiyonlarını kullanır:

```txt
kullanicilar/
kresler/
siniflar/
cocuklar/
raporlar/
duyurular/
users/
```

### `kullanicilar`

Giriş yapan kullanıcıların temel bilgilerini tutar.

Örnek:

```json
{
  "uid": {
    "kullaniciAdi": "ogretmen1",
    "sifre": "123456",
    "rol": "ogretmen",
    "kresId": "default-kres"
  }
}
```

### `kresler`

Kreş bilgilerini ve yönetici yetkilerini tutar.

Örnek:

```json
{
  "default-kres": {
    "ad": "Yumurcak Kreş",
    "adminIds": {
      "adminUid": true
    }
  }
}
```

### `siniflar`

Sınıf bilgilerini tutar.

Örnek:

```json
{
  "sinifId": {
    "name": "Minikler",
    "kresId": "default-kres",
    "teacherIds": ["teacherUid"]
  }
}
```

### `cocuklar`

Çocuk kayıtlarını tutar.

Örnek:

```json
{
  "cocukId": {
    "name": "Zeynep",
    "birthDate": "2023-05-19",
    "sinifId": "sinifId",
    "kresId": "default-kres",
    "parentIds": ["parentUid"]
  }
}
```

### `raporlar`

Çocuklara ait günlük raporları tutar.

Örnek:

```json
{
  "raporId": {
    "cocukId": "cocukId",
    "sinifId": "sinifId",
    "teacherId": "teacherUid",
    "date": "2026-06-06",
    "mood": "Mutlu",
    "yemek": {
      "kahvalti": true,
      "ogle": true,
      "araOgun": false
    },
    "uyku": {
      "duration": 2,
      "note": ""
    },
    "tuvalet": {
      "count": 3,
      "note": ""
    },
    "note": "Bugün çok neşeliydi.",
    "createdAt": 1780000000000
  }
}
```

### `duyurular`

Yönetici tarafından gönderilen duyuruları tutar.

Örnek:

```json
{
  "duyuruId": {
    "title": "Yarın etkinlik var",
    "message": "Çocuklarımız için bahçe etkinliği yapılacaktır.",
    "kresId": "default-kres",
    "sentBy": "adminUid",
    "priority": "normal",
    "targetRole": "all",
    "createdAt": 1780000000000
  }
}
```

### `users`

Push notification token bilgilerini tutmak için kullanılır.

Örnek:

```json
{
  "uid": {
    "pushToken": "ExponentPushToken[...]",
    "role": "parent",
    "updatedAt": 1780000000000
  }
}
```

---

## Kurulum

Projeyi yerel ortamda çalıştırmak için aşağıdaki adımları izleyin.

### 1. Repoyu klonlayın

```bash
git clone https://github.com/furukcell/Yumurcak-app.git
cd Yumurcak-app
```

### 2. Bağımlılıkları yükleyin

```bash
npm install
```

veya

```bash
yarn install
```

### 3. Expo CLI kullanarak başlatın

```bash
npm start
```

veya

```bash
npx expo start
```

---

## Ortam Değişkenleri

Firebase yapılandırması için proje kök dizinine `.env` dosyası eklenmelidir.

Örnek `.env` dosyası:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.europe-west1.firebasedatabase.app
```

> Not: Firebase anahtarları doğrudan kaynak kodda tutulmamalıdır. `.env` dosyası `.gitignore` içine eklenmelidir.

---

## Çalıştırma

### Android

```bash
npm run android
```

### iOS

```bash
npm run ios
```

### Expo Geliştirme Sunucusu

```bash
npm start
```

---

## Bildirim Sistemi

Uygulamada bildirim altyapısı için **Expo Notifications** kullanılmaktadır.

Bildirim sistemi şu işlemleri kapsar:

1. Kullanıcı giriş yaptıktan sonra cihazdan push notification izni alınır.
2. Expo push token üretilir.
3. Token Firebase üzerinde kullanıcıya bağlı şekilde saklanır.
4. Günlük rapor veya duyuru oluşturulduğunda ilgili velilere bildirim gönderilir.

Bildirim gönderme alanları:

- Günlük rapor bildirimi
- Toplu veli duyurusu
- Acil duyuru bildirimi

---

## Güvenlik ve Yetkilendirme

Projede Firebase Realtime Database kuralları ile rol ve ilişki bazlı erişim hedeflenmiştir.

Genel yetki mantığı:

- Kreş verilerini yalnızca ilgili yönetici okuyup yazabilir.
- Çocuk verilerini ilgili veli, öğretmen veya yönetici görebilir.
- Raporları ilgili veli, öğretmen veya yönetici okuyabilir.
- Rapor yazma işlemi öğretmen tarafından yapılır.
- Duyuru oluşturma işlemi yönetici veya gönderici kullanıcı üzerinden sınırlandırılır.

---

## Geliştirme Notları

Bu proje geliştirme aşamasında olan bir mobil uygulamadır. Üretim ortamına geçmeden önce aşağıdaki kontroller önerilir:

### 1. `app.json` kontrolü

`app.json` dosyasındaki Android yapılandırması dikkatle kontrol edilmelidir. JSON formatında eksik virgül veya yanlış blok kapanışı uygulama build sürecinde hata oluşturabilir.

### 2. Expo Project ID

Bildirim sisteminde `YOUR_EXPO_PROJECT_ID` alanı gerçek Expo/EAS proje ID değeriyle değiştirilmelidir.

### 3. Giriş Güvenliği

Mevcut yapı kullanıcı adı ve şifreyi Realtime Database üzerinden kontrol edecek şekilde tasarlanmıştır. Üretim ortamında Firebase Authentication veya daha güvenli bir kimlik doğrulama akışı tercih edilmelidir.

### 4. Şifre Saklama

Şifreler düz metin olarak saklanmamalıdır. Üretim aşamasında hashleme, Firebase Auth veya özel backend doğrulaması kullanılmalıdır.

### 5. Veri Modeli Standardizasyonu

Bazı alan adlarında Türkçe ve İngilizce karışımı kullanılmaktadır. Uzun vadede veri alanlarının standartlaştırılması bakım kolaylığı sağlar.

Örnek:

```txt
cocukId / childId
sinifId / classId
kresId / nurseryId
```

### 6. Bildirim Token Veri Yolu

Kullanıcı verileri için `kullanicilar`, push token için `users` alanı kullanılmıştır. Üretim öncesinde bu iki yapı tek bir standart altında birleştirilebilir.

---

## Yol Haritası

Geliştirme sürecinde eklenebilecek özellikler:

- Fotoğraflı günlük rapor
- Veli–öğretmen mesajlaşması
- Yoklama sistemi
- İlaç/alerji takip ekranı
- Etkinlik takvimi
- Aylık gelişim raporu
- Kreş bazlı abonelik sistemi
- Çoklu kreş desteği
- Yönetici için canlı istatistikler
- Rapor filtreleme ve arama
- PDF rapor çıktısı
- KVKK uyumlu veri saklama politikası
- Firebase Storage ile fotoğraf yükleme
- Push notification geçmişi
- Web yönetim paneli

---

## Ekranlar

Projede yer alan temel ekran grupları:

### Auth

- LoginScreen

### Yönetici

- AdminDashboard
- ClassListScreen
- ClassFormScreen
- ChildListScreen
- ChildFormScreen
- TeacherListScreen
- AnnouncementListScreen
- AnnouncementFormScreen

### Öğretmen

- TeacherDashboardScreen
- ChildReportScreen

### Veli

- ParentDashboard
- ChildReportScreen

---

## Hedef Kullanım Senaryosu

Yumurcak Kreş, küçük ve orta ölçekli kreşler için sade, anlaşılır ve hızlı kullanılabilir bir dijital iletişim aracı olarak konumlandırılabilir.

Örnek günlük kullanım:

1. Yönetici sınıfları ve çocukları sisteme tanımlar.
2. Öğretmen kendi sınıfındaki çocukları görür.
3. Gün sonunda her çocuk için kısa rapor girer.
4. Veli telefonundan çocuğunun raporunu görüntüler.
5. Kreş yöneticisi gerektiğinde tüm velilere duyuru gönderir.
6. Acil durumlarda push bildirim ile veliler hızlıca bilgilendirilir.

---

## Ürün Konumlandırması

Yumurcak Kreş, velilerin çocuklarıyla ilgili gün içi merakını azaltan ve kreşlerin daha profesyonel görünmesini sağlayan bir mobil uygulama olarak konumlandırılabilir.

Uygulamanın değer önerisi:

> Kreş ile veli arasındaki günlük iletişimi daha düzenli, güvenli ve takip edilebilir hale getirmek.

---

## Geliştirici

**Faruk Kurtuluş**

GitHub: [furukcell](https://github.com/furukcell)

---

## Lisans

Bu proje için henüz açık bir lisans belirtilmemiştir. Üretim veya açık kaynak paylaşımı öncesinde uygun bir lisans dosyası eklenmesi önerilir.

Örnek lisans seçenekleri:

- MIT License
- Apache License 2.0
- Proprietary / Tüm hakları saklıdır

---

## Durum

Proje aktif geliştirme / prototip aşamasındadır. Temel yönetici, öğretmen, veli, rapor ve duyuru akışları oluşturulmuştur. Üretim öncesinde güvenlik, Firebase kuralları, bildirim yapılandırması ve build ayarlarının gözden geçirilmesi önerilir.
