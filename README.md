# 🐣 Yumurcak Kreş

> **Kreş yönetimi, öğretmen takibi ve veli iletişimini tek platformda birleştiren mobil SaaS uygulaması.**

Yumurcak; kreşlerin günlük operasyonlarını, öğretmenlerin çocuk takibini ve velilerin çocuklarıyla ilgili günlük bilgilere erişimini tek bir mobil uygulamada birleştirmek amacıyla geliştirilmiştir.

Uygulama **Expo / React Native + Firebase** altyapısı üzerine kuruludur ve yönetici, öğretmen, veli ve superadmin rollerini destekler.

---

## 🚀 Güncel Durum

### 🟢 Ana ürün tamamlandı

Yumurcak'ın ana ürün geliştirme fazları tamamlanmıştır.

Şu anda proje:

```txt
Ana ürün geliştirme        ✅ TAMAMLANDI
Admin paneli               ✅
Öğretmen paneli            ✅
Veli paneli                ✅
Firebase backend           ✅
Günlük takip               ✅
Bildirim sistemi           ✅
Galeri                     ✅
Döküman / PDF sistemi      ✅
Uyum modülü                ✅
Gelişim sistemi            ✅
Rozet sistemi              ✅
Mesajlaşma                 ✅
Duyuru / Anket             ✅
Ödeme takibi               ✅
Abonelik altyapısı         ✅
AI günlük özet             ✅
Dil desteği                ✅
Pilot kurumlar             🟡 HAZIRLANIYOR
Son gerçek cihaz testleri  🟡 DEVAM EDİYOR
```

Yumurcak artık yeni özelliklerin sürekli eklendiği erken aşama bir prototip değil; **gerçek kreşlerde kullanılmak üzere hazırlanmış, ticari kullanıma yönelik bir SaaS ürünüdür.**

---

# 🎯 Ürünün Amacı

Yumurcak'ın amacı kreş içerisindeki dağınık iletişim ve takip süreçlerini tek bir dijital sistem altında toplamaktır.

Geleneksel yapı:

```txt
Öğretmen
   ↓
Kağıt / WhatsApp / Excel
   ↓
Yönetici
   ↓
Veli
```

Yumurcak ile:

```txt
             ┌──────────────┐
             │   YUMURCAK   │
             └──────┬───────┘
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
    Yönetici     Öğretmen       Veli
       │            │            │
       └────────────┼────────────┘
                    ↓
             Firebase Backend
```

Tüm taraflar aynı veri yapısı üzerinden çalışır.

---

# 👥 Kullanıcı Rolleri

## 👨‍💼 Yönetici

Kreşin tüm operasyonunu yönetir.

* Kurum yönetimi
* Sınıf yönetimi
* Öğretmen yönetimi
* Çocuk yönetimi
* Veli bağlantıları
* Ödeme takibi
* Yemek listeleri
* Ders programları
* Galeri
* Duyurular
* Anketler
* Kurum Zili
* Medikal bilgiler
* Gelişim takibi
* Uyum takibi
* Rozetler
* Belgeler / PDF
* Tema yönetimi
* Abonelik

---

## 👩‍🏫 Öğretmen

Günlük çocuk takibinin merkezidir.

* Günlük rapor
* Ruh hali
* Kahvaltı / öğle / ara öğün
* Uyku
* Tuvalet
* Öğretmen notu
* Yoklama
* Fiziksel gelişim
* Uyum takibi
* Haftanın Yıldızı
* Rozet
* Galeri
* Ders programı
* Duyuru
* Mesajlaşma
* Hazır duyuru araçları
* Günlük kontrol paneli

---

## 👨‍👩‍👧 Veli

Çocuğuyla ilgili bilgileri tek uygulamadan takip eder.

* Günlük özet
* Günlük rapor
* Yemek bilgileri
* Uyku
* Tuvalet
* Ruh hali
* Öğretmen notları
* Yoklama
* Fiziksel gelişim
* Aylık gelişim
* Sınıf ortalaması
* Uyum skoru
* Rozetler
* Haftanın Yıldızı
* Galeri
* Fotoğraf / video
* Duyurular
* Anketler
* Mesajlaşma
* Ödeme bilgileri
* Yemek listesi
* Ders programı
* PDF belgeleri
* Bildirim merkezi

---

## 🛡️ Superadmin

Yumurcak platformunun merkezi yönetimi için kullanılan yönetim katmanıdır.

* Kreş yönetimi
* Kurum kontrolü
* Kullanıcı yönetimi
* Sistem yönetimi
* Merkezi içerik yapıları
* Abonelik kontrolü

---

# 📱 Ana Modüller

## 📋 Günlük Takip

Öğretmen tek ekrandan çocuğun günlük durumunu kaydedebilir.

### Günlük rapor

* Ruh hali
* Kahvaltı
* Öğle yemeği
* Ara öğün
* Uyku süresi
* Tuvalet
* Öğretmen notu

Yemek durumları:

```txt
Yemedi
Az yedi
Bitirdi
```

girilebilir.

---

# 🧒 Gelişim Takibi

Çocuğun fiziksel gelişimi düzenli olarak kaydedilebilir.

Veli tarafında:

* Aylık Gelişim
* Sınıf Ortalaması

ekranları bulunur.

Sınıf ortalaması:

* Minimum 5 çocuk şartı
* Anonim karşılaştırma
* Çocuk isimlerini göstermeme
* Sıralama / derece göstermeme

mantığıyla çalışır.

---

# 🌱 Uyum Modülü

Yeni başlayan çocukların ilk 30 günlük adaptasyon sürecini takip etmek için geliştirilmiştir.

```txt
Yeni başlayan çocuk
        ↓
30 günlük takip
        ↓
Öğretmen günlük değerlendirmesi
        ↓
Uyum skoru
        ↓
Veli bilgilendirmesi
```

Özellikler:

* Yeni başlayan öğrenci tanımlama
* Günlük uyum kaydı
* Öğretmen Uyum Takibi
* Otomatik uyum skoru
* 30 günlük takip
* Takibin otomatik kapanması
* Veli Uyum Skoru
* Uyum bildirimleri

---

# 🏆 Rozet & Haftanın Yıldızı

Çocukların olumlu davranışlarını desteklemek için geliştirilmiştir.

* Haftanın Yıldızı
* Rozet verme
* Rozet geçmişi
* Veli Rozetlerim
* Haftalık rozet kartı
* Push bildirimi

Rozetler yalnızca ilgili çocuğun velisi tarafından görüntülenebilir.

---

# 📸 Galeri

Kreş ile veli arasındaki görsel iletişimi sağlar.

Desteklenen içerikler:

* Fotoğraf
* Video
* Çoklu medya
* Grid görünümü
* Uygulama içi görüntüleme
* Uygulama içi video oynatma
* Cihaza kaydetme

### Medya optimizasyonu

Fotoğraflar otomatik olarak optimize edilir.

```txt
Fotoğraf → maksimum 1920px / optimize kalite
Video    → yaklaşık 720p / boyut kontrolü
```

Galeride süreli görünürlük ve otomatik temizlik mekanizmaları da bulunmaktadır.

---

# 🔔 Bildirim Sistemi

Bildirim sistemi Firebase Cloud Functions üzerinden çalışır.

Temel akış:

```txt
Uygulamada olay oluşur
        ↓
Firebase
        ↓
Cloud Function
        ↓
Bildirim kaydı
        ↓
Expo Push API
        ↓
Kullanıcının telefonu
```

Desteklenen bildirimler:

* Duyuru
* Ödeme
* Mesaj
* Kurum Zili
* Günlük Rapor
* Galeri
* Anket
* Haftanın Yıldızı
* Rozet
* Yoklama
* Yemek Listesi
* Medikal Bilgi
* Fiziksel Gelişim
* Uyum

Bildirim durumları takip edilebilir:

```txt
pending
sent
no_tokens
error
skipped_empty_body
```

Ayrıca bildirimlere bağlı deep-link yapısı bulunmaktadır.

---

# 💬 İletişim

Kreş, öğretmen ve veli arasındaki iletişim uygulama içine alınmıştır.

### Duyurular

Hedefli duyuru:

* Kurum
* Sınıf
* Öğretmen
* Veli

bazında gönderilebilir.

### Anket

* Anket oluşturma
* Hedef kitle seçimi
* Oylama
* Sonuç görüntüleme
* Bildirim

### Mesajlaşma

Kullanıcılar uygulama içerisinden iletişim kurabilir.

---

# 🔔 Kurum Zili

Kreş yönetiminin tüm kuruma veya belirli kullanıcı gruplarına hızlı bildirim göndermesini sağlar.

---

# 🍽️ Yemek Listesi

Aylık yemek planları yapılandırılmış veri olarak oluşturulur.

Desteklenen yapı:

* Gün
* Kahvaltı
* Öğle yemeği
* Ara öğün
* Açıklama

Liste ve takvim görünümü bulunur.

Aylık plan:

```txt
Taslak
   ↓
Kontrol
   ↓
Ayı Yayınla
   ↓
Veli / Öğretmen
```

şeklinde çalışır.

---

# 📚 Ders Programı

Aylık ders / etkinlik programı yapılandırılmış veriler üzerinden oluşturulur.

* Gün bazlı etkinlik
* Açıklama
* Aylık program
* Takvim görünümü
* Liste görünümü
* Yayınlama
* Yayından kaldırma
* Önceki aydan kopyalama
* Arşiv

Öğretmen kendi sınıfına otomatik bağlanır.

Veli tarafında ise yayınlanmış program günlük özet ekranına otomatik beslenir.

---

# 📄 PDF & Döküman Sistemi

Yumurcak'ın önemli özelliklerinden biri yapılandırılmış veriden otomatik belge üretmesidir.

Tek veri:

```txt
Yemek / Ders / Kurum bilgisi
          ↓
      PDF Renderer
          ↓
       A4 belge
```

Desteklenen belgeler:

* Aylık Yemek Listesi
* Ders Programı
* Aylık Bülten
* Nöbet Çizelgesi
* Personel Görev Listesi
* Servis Listesi
* Doğum Günü Takvimi
* Gezi Formu
* İlaç Takip Formu

PDF sistemi:

* Admin
* Öğretmen
* Veli

tarafında ortak renderer mantığı kullanır.

Tekrar eden ayrı PDF üretim kodları yerine ortak servis mimarisi kullanılmıştır.

---

# 🗂️ İçerik Kütüphaneleri

## Etkinlik Kütüphanesi

Kreşler arasında anonim olarak ortak kullanılabilen etkinlik havuzu bulunur.

* Etkinlik arama
* Otomatik tamamlama
* Yaş grubu standardizasyonu
* Merkezi havuz
* Kreşler arasında anonim veri

## Yemek Kütüphanesi

Benzer şekilde yemek havuzu bulunur.

Amaç öğretmenin her ay içerikleri sıfırdan oluşturmak zorunda kalmamasıdır.

---

# 🤖 Yapay Zeka Günlük Özeti

Öğretmenin girdiği günlük veriler kullanılarak veliye daha doğal bir günlük özet oluşturulması için AI altyapısı hazırlanmıştır.

Veriler:

```txt
Ruh hali
Yemek
Uyku
Tuvalet
Öğretmen notu
        ↓
      AI
        ↓
Doğal günlük özet
```

Amaç; klasik:

> “Bugün yemeğini yedi. Uykusunu uyudu.”

gibi mekanik metinler yerine daha doğal ve bağlamlı bir veli iletişimi sağlamaktır.

---

# 💳 Abonelik Sistemi

Yumurcak ticari SaaS modeliyle çalışacak şekilde tasarlanmıştır.

Altyapı:

* RevenueCat
* Google Play Billing
* YUMURCAK Pro entitlement
* Google Play ürünleri
* Offering / Package sistemi

### Güncel fiyatlandırma

| Paket       | Öğrenci |    Aylık |    Yıllık |
| ----------- | ------: | -------: | --------: |
| Başlangıç   |    0–30 | 1.000 TL | 10.000 TL |
| Profesyonel |   31–50 | 1.500 TL | 15.000 TL |
| Kurum       |  51–100 | 3.000 TL | 30.0000 TL |
| Kurumsal    |    100+ |     Özel |      Özel |

> Pilot kurumlara özel başlangıç fiyatları ayrıca uygulanabilir.

---

# 🔐 Güvenlik & Gizlilik

Yumurcak çocuk verileriyle çalışan bir sistem olduğu için veri izolasyonu temel mimari prensiplerden biridir.

Altyapıda:

* Firebase Authentication
* Firebase Realtime Database
* Firebase Storage
* Rol bazlı erişim
* `kresId` bazlı veri izolasyonu
* Sınıf bazlı erişim
* Veli / çocuk ilişkilendirmesi
* Storage erişim kuralları
* KVKK Aydınlatma Metni
* Gizlilik Politikası
* Kullanım Şartları
* Hesap silme sayfası

bulunmaktadır.

Özellikle farklı kreşlerin birbirlerinin verilerine erişmemesi için kurum bazlı veri izolasyonu uygulanır.

---

# 🏗️ Teknik Mimari

```txt
React Native / Expo
        │
        ├── React Navigation
        ├── Context API
        ├── i18next
        ├── Expo Notifications
        ├── Expo Print
        ├── Expo Sharing
        └── RevenueCat
                │
                ↓
             Firebase
                │
       ┌────────┼────────┐
       ↓        ↓        ↓
     Auth      RTDB    Storage
                         │
                         ↓
                  Cloud Functions
                         │
                         ↓
                    Expo Push
```

---

# 🧩 Kullanılan Teknolojiler

### Mobile

* React Native
* Expo SDK
* React Navigation
* React Native Safe Area
* React Native Keyboard Controller

### Backend

* Firebase Authentication
* Firebase Realtime Database
* Firebase Storage
* Firebase Cloud Functions

### Bildirim

* Expo Notifications
* Expo Push API
* Firebase Cloud Functions

### Monetization

* RevenueCat
* Google Play Billing

### Documents

* Expo Print
* Expo Sharing
* HTML → PDF render

### Internationalization

* i18next
* react-i18next
* AsyncStorage

### CI/CD

* GitHub
* GitHub Actions
* EAS Build
* Codemagic

---

# 🖥️ Web Yönetim Paneli

Mobil uygulamaya ek olarak, kreş yöneticileri için **ayrı bir web admin
paneli** geliştirilmektedir: [`yumurcak-web-panel`](https://github.com/furukcell/yumurcak-web-panel).

Panel, mobil koda dokunmadan aynı Firebase projesini (aynı Auth, aynı
Realtime Database, aynı Storage) kullanır — yani veri tek yerde, mobil
ve web aynı veriyi okuyup yazar. Masaüstünden tablo/filtre/toplu işlem
gibi ihtiyaçlar için ayrı bir arayüz olarak kurgulandı.

**Teknoloji:** React + Vite, Ant Design, Firebase JS SDK (web), Firebase
Hosting, GitHub Actions ile otomatik deploy. Detaylı mimari kararları
ve faz planı için bkz. [`docs/web-panel-plan.md`](docs/web-panel-plan.md).

**Durum: Faz 0 – Faz 6 tamamlandı** ✅

```txt
Faz 0 — Proje İskeleti (giriş, rol kontrolü, panel iskeleti)   ✅
Faz 1 — Dashboard + İstatistik                                 ✅
Faz 2 — Çekirdek Yönetim (Çocuk/Öğretmen/Veli/Sınıf CRUD)       ✅
Faz 3 — İletişim (Duyuru/Etkinlik/Anket/Mesajlar)               ✅
Faz 4 — Operasyonel (Yemek/Ders/Nöbet/Personel/Servis + PDF)    ✅
Faz 5 — Finans (Ödemeler)                                       ✅
Faz 6 — Ayarlar (Kurum/Tema/Abonelik/Kurum Zili/Yasal Belgeler) ✅
```

Bilinen kapsam dışı noktalar: Servis aylık istatistik sekmesi, gerçek
abonelik satın alma (RevenueCat/App Store/Play Store mobil-özel
olduğu için web'de sadece durum görüntüleme + demo/promosyon var),
ve ayrıca planlanan Muhasebe modülü (Gider Takibi, İzin Yönetimi vb.)
henüz başlanmadı.

Sıradaki adım: GitHub'a toplu yükleme sonrası uçtan uca canlı test
(özellikle Firebase Auth hesabı oluşturan Öğretmen/Veli/Servisci
ekleme akışları ve Storage'a kurum logosu yükleme).

---

# 🌍 Dil Desteği

Dil desteği şu anda aktif geliştirme aşamasındadır.

Mevcut altyapı:

```txt
Türkçe   ✅
İngilizce kaynaklar  ✅
Rusça kaynaklar  ✅
Almanca kaynaklar  ✅
Fransızca kaynaklar  ✅
i18next  ✅
LanguageContext  ✅
Dil tercihi saklama  ✅
```

Sonraki adım:

```txt
Ekranların i18n anahtarlarına geçirilmesi
        ↓
Dil seçici
        ↓
Türkçe / İngilizce uçtan uca test
```

Dil sistemi tamamlandığında Yumurcak'ın uluslararası kullanıma uygun altyapısı güçlendirilmiş olacaktır.

---

# 🧪 Canlıya Geçiş Durumu

Ana ürün geliştirmesi tamamlanmıştır.

Şu anda odak:


### 1. Gerçek cihaz testleri

```txt
🟡 SON KONTROLLER
```

Kontrol edilecek temel akışlar:

* Admin giriş
* Öğretmen giriş
* Veli giriş
* Kullanıcı bağlantıları
* Günlük rapor
* Yoklama
* Gelişim
* Uyum
* Rozet
* Galeri
* Duyuru
* Anket
* Ödeme
* Mesaj
* Bildirim
* PDF
* Tema
* Döküman yayınlama
* Geçen ayı kopyalama
* Arşiv

### 2. Abonelik testi

```txt
🟡 SON KONTROL
```

* Google Play satın alma
* RevenueCat entitlement
* Restore
* Firebase abonelik kaydı

### 3. Firebase güvenlik kontrolü

```txt
🟡 SON AUDIT
```

### 4. Pilot kurumlar

```txt
🟡 HAZIRLANIYOR
```

Gerçek kreşlerden kullanım verisi ve geri bildirim toplanacaktır.

---

# 🗺️ Ürün Yol Haritası

## Faz 1 — Temel Platform

**TAMAMLANDI ✅**

* Firebase
* Authentication
* Roller
* Admin
* Öğretmen
* Veli
* Superadmin
* Kurum yönetimi

## Faz 2 — Günlük Takip

**TAMAMLANDI ✅**

* Günlük rapor
* Yoklama
* Yemek
* Gelişim
* Uyum

## Faz 3 — İletişim

**TAMAMLANDI ✅**

* Duyuru
* Anket
* Mesajlaşma
* Kurum Zili
* Push notification

## Faz 4 — Galeri

**TAMAMLANDI ✅**

* Fotoğraf
* Video
* Optimizasyon
* Görüntüleme
* Kaydetme
* Otomatik temizlik

## Faz 5 — Gelişim & Motivasyon

**TAMAMLANDI ✅**

* Fiziksel gelişim
* Sınıf ortalaması
* Uyum
* Rozet
* Haftanın Yıldızı

## Faz 6 — Dökümanlar

**TAMAMLANDI ✅**

* Aylık yemek listesi
* Ders programı
* Liste / Takvim
* Yayınlama
* Yayından kaldırma
* Geçen ayı kopyalama
* Arşiv
* PDF
* Belge şablonları
* Etkinlik kütüphanesi
* Yemek kütüphanesi
* Öğretmen verimlilik araçları

## Faz 7 — Ticari Sistem

**TAMAMLANDI ✅**

* RevenueCat
* Google Play abonelik
* Pro entitlement
* Paket sistemi

## Faz 8 — AI

**TAMAMLANDI ✅**

* AI günlük özet altyapısı

## Faz 9 — Çoklu Dil

* i18n altyapısı
* Türkçe kaynaklar
* İngilizce kaynaklar
* Dil tercihi
* Ekranların i18n sistemine geçirilmesi
* Dil seçici
* Uçtan uca dil testi

  **TAMAMLANDI ✅**

## Faz 10 — Pilot & Ölçekleme **🟡 DEVAM EDİYOR**

**🟡 SIRADAKİ  AŞAMA**

```txt
Pilot kreşler
     ↓
Gerçek kullanım
     ↓
Geri bildirim
     ↓
Hata / UX düzeltmeleri
     ↓
İlk ücretli müşteriler
     ↓
Kreş sayısının artırılması
```

---

# 🎯 Yumurcak'ın Bundan Sonraki Hedefi

Artık ana hedef yeni özellik eklemek değildir.

Ana hedef:

> **Yumurcak'ı gerçek kreşlerde düzenli kullanılan, para kazanan ve ölçeklenebilir bir SaaS ürününe dönüştürmek.**

Öncelik sırası:

```txt

1. Gerçek cihaz testlerini bitir
        ↓
2. Firebase Rules son kontrol
        ↓
3. RevenueCat / Google Play gerçek satın alma testi
        ↓
4. Pilot kreşleri sisteme al
        ↓
5. Gerçek kullanım verisi topla
        ↓
6. Hataları ve UX sorunlarını düzelt
        ↓
7. İlk düzenli abonelikleri başlat
        ↓
8. Satış ve büyüme
```

---

# 📊 Ürün Vizyonu

Yumurcak yalnızca bir “kreş takip uygulaması” olarak konumlandırılmamaktadır.

Uzun vadeli hedef:

```txt
                    YUMURCAK
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
     Yönetim        Öğretmen         Veli
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                Ortak Veri Sistemi
                       ↓
              Akıllı Kreş Platformu
```

Amaç; kreşin günlük operasyonundan veli iletişimine, doküman üretiminden çocuk gelişimine kadar mümkün olduğunca fazla süreci tek platformda toplamaktır.

---

# 📌 Proje Özeti

**Yumurcak Kreş**, gerçek kreşlerin günlük kullanımına yönelik geliştirilen mobil SaaS platformudur.

### Bugünkü ürün:

```txt
🟢 Ana ürün tamamlandı
🟢 Admin paneli
🟢 Öğretmen paneli
🟢 Veli paneli
🟢 Superadmin
🟢 Firebase backend
🟢 Günlük takip
🟢 Gelişim
🟢 Uyum
🟢 Rozet
🟢 Galeri
🟢 Mesajlaşma
🟢 Duyuru
🟢 Anket
🟢 Bildirim
🟢 Ödeme
🟢 PDF / Döküman
🟢 RevenueCat
🟢 AI günlük özet
🟢 Dil desteği
🟡 Son gerçek cihaz testleri
🟡 Pilot kurumlar
```

**Yumurcak artık fikir veya prototip aşamasında değildir.**

**Hedef: Gerçek kreşlerde kullanılan, sürdürülebilir abonelik geliri üreten ve zaman içerisinde Türkiye'deki kreşler için kapsamlı bir dijital yönetim platformuna dönüşen bir SaaS ürünü olmaktır.**

---

## 📄 Yasal

Yasal dokümanlar:

* Gizlilik Politikası
* KVKK Aydınlatma Metni
* Kullanım Şartları
* Hesap Silme

`docs/` klasörü altında bulunmaktadır.

---

## 👨‍💻 Geliştirici

**FK Digital**

Yumurcak Kreş, FK Digital tarafından geliştirilen bir ürünüdür.
