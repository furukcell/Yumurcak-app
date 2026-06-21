## Yumurcak Geliştirme Geçmişi ve Güncel Yol Haritası

Bu dosya Yumurcak-app projesinin yapılan işlerini, güncel durumunu ve bundan sonraki yol haritasını tutar.

---

## Geçilen Adımlar

### 18 Mayıs 2026 — Proje Başlangıcı

- Yumurcak-app GitHub reposu oluşturuldu.
- Expo / React Native tabanlı mobil uygulama fikri kod tarafına taşındı.

### 22 Mayıs 2026 — Uygulama İskeleti

- Expo / React Native proje yapısı kuruldu.
- App.js, navigation ve giriş altyapısı oluşturuldu.
- AuthContext ve rol bazlı yönlendirme başladı.

### 23 Mayıs 2026 — Yönetici / Öğretmen / Veli Panelleri

- AdminStack oluşturuldu.
- TeacherStack oluşturuldu.
- ParentStack oluşturuldu.
- Yönetici tarafında sınıf, çocuk, öğretmen, veli ve duyuru yönetimi için temel ekranlar eklendi.
- Öğretmen tarafında sınıf çocuklarını görme ve günlük rapor girme yapısı başladı.
- Veli tarafında çocuğa bağlı rapor ve duyuru görüntüleme başladı.

### 17 Haziran 2026 — Android / Firebase Düzeltmeleri

- App açılışı, app.json ve Android build tarafındaki sorunlar üzerinde düzeltmeler yapıldı.
- Firebase Realtime Database bağlantıları stabilize edildi.

### 18 Haziran 2026 — README ve Yol Haritası

- README ve yol haritası dosyaları oluşturuldu.
- Proje MVP / SaaS bakışıyla yeniden düzenlendi.

### 20 Haziran 2026 — Veli Arayüzü Modernleştirme

- Veli dashboard modern mor/beyaz mobil tasarıma geçirildi.
- Günlük rapor, duyuru, yemek listesi ve profil akışları düzenlendi.

### 20 Haziran 2026 — Yönetici Paneli Modernleştirme

- Admin ana panel modernleştirildi.
- Yönetim işlem kartları düzenlendi.
- Öğretmen, veli ve çocuk listeleri zenginleştirildi.
- Çocuk detay, ödeme takibi, ders programı ve etkinlik takvimi için temel ekran yapıları eklendi.

### 20 Haziran 2026 — Süper Admin / Abonelik / Auth Altyapısı

- Süper Admin paneli eklendi.
- Kreş onboarding akışı eklendi.
- Demo abonelik ve abonelik guard sistemi kuruldu.
- Firebase Auth hibrit geçiş sistemi ve eski login fallback mantığı eklendi.
- Firebase index node yapısı hazırlandı.

### 21 Haziran 2026 — Tema Sistemi

- Kreş bazlı tema sistemi eklendi.
- 10 tema paleti oluşturuldu.
- ThemeProvider root navigation’a bağlandı.
- Yönetici Tema Ayarları ekranı eklendi.
- Veli ve öğretmen ana ekranları dinamik temaya bağlandı.
- Parent/Teacher ortak ekran bileşenleri tema desteği alacak şekilde düzenlendi.

### 21 Haziran 2026 — Veli Alt Tab ve Günlük Özet

- Veli tarafına alt tab bar eklendi.
- Alt tab yapısı:

```txt
📊 Özet
🏠 Anasayfa
📋 Raporlar
📈 Gelişim
💬 Mesaj
```

- İlk giriş ekranı `Özet` yapıldı.
- Özet ekranı günlük rapor, yoklama, yemek listesi, ders programı, etkinlik, duyuru, ödeme ve anketlerden otomatik bilgi çekecek şekilde kuruldu.

### 21 Haziran 2026 — Kurum Zili / Ödeme / Anketler

- Kurum Zili ekranı eklendi.
- Ödeme Takibi ekranı eklendi.
- Anketler / Oylamalar ekranı eklendi.
- Anasayfa işlem merkezine yeni kartlar eklendi:

```txt
🔔 Kurum Zili
💳 Ödeme Takibi
🗳️ Anketler
☎️ Kurum İletişim
```

- Özet ekranına Kurum Zili ve Mesaj hızlı butonları eklendi.
- Özet ekranına bekleyen ödeme ve cevap bekleyen anket uyarı kartları eklendi.

---

## Şu Anki Durum

### Güçlü Taraflar

- Proje artık sadece ekran tasarımı değil, çalışan SaaS mantığına sahip.
- Rol bazlı paneller ayrılmış durumda.
- Firebase Realtime Database ana omurga olarak kullanılıyor.
- Kreş bazlı `kresId` mimarisi var.
- Abonelik guard sistemi var.
- Tema sistemi kurum bazlı çalışıyor.
- Veli tarafı artık daha profesyonel bir ürün deneyimine yaklaştı.
- Özet ekranı doğru ürün mantığına geçti: her şeyin kısa günlük özeti.
- Kurum Zili, Ödeme Takibi ve Anketler modülleri ürün değerini artırdı.

### Dikkat Edilecek Noktalar

- Yeni ekranlar gerçek cihazda test edilmediği için build sonrası küçük syntax/import hatası çıkabilir.
- Özet ekranındaki veri field adları Firebase’deki gerçek kayıtlarla birebir eşleşmeyebilir.
- Ödeme, Anket ve Kurum Zili modüllerinin yönetici tarafındaki tam karşılıkları henüz tamamlanmalı.
- Kurum Zili için push notification yok; şu an sadece kayıt atma mantığı var.
- Firebase Rules production seviyesine geçmeden önce Auth migration tamamlanmalı.

---

## Bundan Sonra Yapılacaklar

### FAZ 1 — Build ve Kırmızı Hata Temizliği

Öncelik: Uygulamanın açılması.

Yapılacaklar:

- `npx expo start --clear` ile Metro testi.
- Veli hesabıyla giriş.
- Özet ekranı açılıyor mu kontrol.
- Alt tab geçişleri kontrol.
- ParentBell / ParentPayments / ParentPolls ekranları açılıyor mu kontrol.
- Import veya route hatası varsa tek tek düzelt.

Başarı kriteri:

> Uygulama kırmızı hata vermeden açılacak ve veli alt tabda gezilebilecek.

---

### FAZ 2 — Veli Özet Veri Eşleştirme

Öncelik: Özet ekranındaki kartların gerçek Firebase verisiyle dolması.

Kontrol edilecek node’lar:

```txt
gunlukRaporlar/
yoklamalar/
yemekListeleri/
dersProgramlari/
etkinlikler/
duyurular/
odemeler/
anketler/
```

Yapılacaklar:

- Günlük rapor field adları kontrol edilecek.
- Yemek durumları `kahvalti / ogle / araOgun` yapısıyla uyumlu mu bakılacak.
- Yoklama giriş saati field adı kontrol edilecek.
- Ders programı gün/saat field adları kontrol edilecek.
- Etkinlik sınıf/kres filtreleri kontrol edilecek.
- Bekleyen ödeme kartı doğru çıkıyor mu test edilecek.
- Cevaplanmamış anket kartı doğru çıkıyor mu test edilecek.

Başarı kriteri:

> Veli özet ekranı gerçek günlük verileri otomatik ve doğru şekilde gösterecek.

---

### FAZ 3 — Yönetici Tarafı Karşılıkları

Yeni veli modüllerinin yönetici tarafında da karşılığı netleşmeli.

Yapılacaklar:

#### Kurum Zili Yönetimi

- `kurumZili/` kayıtlarını gören yönetici ekranı.
- Okundu / ilgilenildi işareti.
- Son bildirimler listesi.
- İleride push notification altyapısına hazırlık.

#### Anket Yönetimi

- Yönetici anket oluşturabilmeli.
- Başlık, açıklama, seçenekler, sınıf/kres filtresi girebilmeli.
- Aktif/pasif yapabilmeli.
- Cevapları ve oranları görebilmeli.

#### Ödeme Yönetimi

- Yönetici çocuk/veli bazlı ödeme oluşturabilmeli.
- Tutar, dönem, son ödeme tarihi ve durum girilebilmeli.
- IBAN bilgisi kurum ayarlarından çekilebilmeli.
- Ödendi/bekliyor durumları düzenlenebilmeli.

Başarı kriteri:

> Veli tarafında görünen Kurum Zili, Anket ve Ödeme modüllerinin yönetici tarafında yönetilebilir karşılığı olacak.

---

### FAZ 4 — Aylık Gelişim / AI Yorum

Öncelik: Ürünün fark yaratan kısmını oluşturmak.

Yapılacaklar:

- Gelişim tabında aylık rapor ekranı geliştirilecek.
- Günlük raporlar üzerinden istatistikler hesaplanacak.
- Katılım, ruh hali, uyku, yemek ve etkinlik grafikleri çıkarılacak.
- AI yorum ilk etapta manuel/şablon bazlı üretilebilir.
- Sonra gerçek AI API entegrasyonu yapılabilir.

İlk veri kaynakları:

```txt
gunlukRaporlar/
yoklamalar/
etkinlikler/
yemekListeleri/
```

Başarı kriteri:

> Veli ay sonunda çocuğun gelişimini tek ekranda anlaşılır şekilde görecek.

---

### FAZ 5 — Tema ve UI Tamamlama

Yapılacaklar:

- Tüm detay ekranları tema sistemine tam bağlanacak.
- ThemedBackground desen/figür görünümü geliştirilecek.
- Profil ve ayarlar ekranları tema ile uyumlu hale getirilecek.
- Boş veri ekranları standartlaştırılacak.
- Loading state ve disabled button kontrolleri tamamlanacak.

Başarı kriteri:

> Uygulama her rolde görsel olarak tutarlı ve profesyonel olacak.

---

### FAZ 6 — Firebase Auth ve Production Rules

Yapılacaklar:

- Tüm demo kullanıcılar Firebase Auth’a geçirilecek.
- Eski düz metin şifre fallback sistemi kademeli kaldırılacak.
- Production RTDB rules uygulanacak.
- Storage rules uygulanacak.
- `kresId` bazlı veri izolasyonu test edilecek.

Başarı kriteri:

> Her rol sadece kendi erişmesi gereken veriye erişebilecek.

---

### FAZ 7 — Pilot Kreş Demo Hazırlığı

Yapılacaklar:

- Demo veri seti hazırlanacak.
- Bir kreş için yönetici, öğretmen, veli ve çocuk kayıtları oluşturulacak.
- Gerçek cihazda 1 günlük senaryo test edilecek.
- Pilot sunum videosu veya ekran akışı hazırlanacak.
- Fiyatlandırma ve demo süresi netleştirilecek.

Başarı kriteri:

> Uygulama bir kreşe gösterilebilir, anlatılabilir ve demo hesapla denenebilir seviyeye gelecek.

---

## Öncelik Sırası

1. Build / Metro hata kontrolü
2. Veli Özet ekranı gerçek veri testi
3. Yönetici tarafında Kurum Zili kayıtlarını görme
4. Yönetici anket oluşturma ve sonuç görme
5. Yönetici ödeme oluşturma ve IBAN yönetimi
6. Aylık gelişim / AI rapor ekranı
7. Tema ve UI detay temizliği
8. Firebase Auth + Production Rules
9. Pilot kreş demo

---

## Şimdilik Yapılmayacaklar

- Web panel
- App Store yayını
- RevenueCat / online ödeme
- Muhasebe veya e-fatura entegrasyonu
- Çoklu ülke / çoklu dil
- Push notification zorunlu entegrasyonu

Push notification özellikle Kurum Zili için değerli olacak ama MVP stabil olmadan eklenmemeli.

---

## Kısa Karar

Yumurcak şu anda çalışan bir MVP + SaaS altyapısıdır. Son eklenen Veli Özet, Kurum Zili, Ödeme Takibi, Anketler ve Tema Sistemi ürünü daha profesyonel hale getirmiştir. Ancak ücretli müşteri öncesi en kritik iş; build testi, Firebase veri field eşleştirmesi, yönetici tarafı karşılıkları ve güvenlik kurallarıdır.
