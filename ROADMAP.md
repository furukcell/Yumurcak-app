# Yumurcak Kreş Yol Haritası

Bu dosya build öncesi ve sonrası yapılacak işleri fazlara ayırır.

> Son güncelleme: 22 Haziran 2026

---

## Tamamlanan Fazlar

### FAZ 1 — Veli Paneli Temel Yapı

- Veli alt tab yapısı kuruldu.
- Özet, anasayfa, raporlar, gelişim ve mesaj alanları bağlandı.
- Safe-area düzenlemeleri yapıldı; alt tab bar telefon sistem butonlarıyla çakışmayacak hale getirildi.

### FAZ 2 — Veli Günlük Özet ve Gelişim

- Günlük rapor, yoklama, yemek, etkinlik ve ödeme verileri özet ekranına bağlandı.
- Aylık gelişim ekranı eklendi.
- Boy/kilo geçmişi ve mini grafik görünümü eklendi.
- Profil fotoğrafı anasayfa ve özet alanlarına yansıtıldı.

### FAZ 3 — Admin Operasyon Modülleri

- Ödeme yönetimi güçlendirildi.
- Anket yönetimi eklendi.
- Kurum Zili admin ekranı eklendi.
- Admin panelinde ödeme, anket ve kurum zili akışları çalışır hale getirildi.

### FAZ 4 — Tema ve Görsel Sistem

- 10 tema için özel arka plan dosyaları eklendi.
- Tema sistemi veli ekranlarına entegre edildi.
- ThemedBackground / ThemePatternBackground yapıları güçlendirildi.
- Tema altyapısının öğretmen ve admin ekranlarına yayılması sonraki iyileştirme listesine alındı.

### FAZ 5 — Build Öncesi Stabilizasyon

- Veli ekranları crash risklerine karşı güçlendirildi.
- Admin ekranları crash risklerine karşı güçlendirildi.
- Route/import kontrolleri yapıldı.
- Build öncesi test listesi eklendi.
- Mesaj gönderilip başarılı olduğu halde hata alerti çıkma riski azaltıldı.

### FAZ 6 — Kurum İstatistikleri

- Yönetici ekranına Kurum İstatistikleri modülü eklendi.
- Genel kurum istatistikleri hazırlandı.
- Öğretmen bazlı kullanım/performans görünümü hazırlandı.
- Çocuk bazlı yemek, uyku, etkinlik, ruh hali ve devamsızlık riskleri eklendi.
- Riskler sekmesi eklendi.

### FAZ 7 — Galeri Modülü

- Ortak galeri ekran altyapısı eklendi.
- Yönetici ve öğretmen fotoğraf/video yükleyebilir hale getirildi.
- Veli sadece kendi çocuğu veya sınıfıyla ilişkili aktif medyaları görebilir hale getirildi.
- Galeri medya kayıtlarına 24 saatlik `expiresAt` mantığı eklendi.
- Süresi dolan galeri kayıtları uygulama içinde gizlenir.
- Yönetici/öğretmen galeri ekranı açıldığında eski kayıtlar temizlenmeye çalışılır.

### FAZ 8 — Yasal Metinler

- Kullanım Şartları eklendi.
- Gizlilik Politikası eklendi.
- KVKK Aydınlatma Metni eklendi.
- Giriş ekranı, veli profili, öğretmen profili ve admin kurum bilgileri alanından erişilecek şekilde planlandı/bağlandı.
- Galeri fotoğraf/video içerikleri ve 24 saat görünürlük bilgisi yasal metinlerde belirtildi.

### FAZ 9 — RevenueCat / Abonelik Ödeme

- RevenueCat SDK altyapısı eklendi.
- Android SDK key bağlandı.
- `default` offering okuma akışı hazırlandı.
- `monthly` ve `yearly` package okuma akışı hazırlandı.
- Satın alma ve restore fonksiyonları eklendi.
- Admin abonelik ekranı RevenueCat servis katmanına bağlandı.
- RevenueCat sonucu başarılı olursa Firebase `abonelikler/{kresId}` kaydını güncelleyecek iskelet hazırlandı.

Kalan RevenueCat işleri:

- Google Play ürünlerini oluşturma.
- RevenueCat service account bağlantısı.
- Google Play ürünlerini RevenueCat package/entitlement ile eşleme.
- Gerçek satın alma testi.

### FAZ 10 — Bildirimler

#### FAZ 10.1 — Uygulama içi bildirim merkezi

- Ortak bildirim servisi eklendi.
- Ortak bildirim ekranı eklendi.
- Admin / öğretmen / veli ekranlarına bildirim butonu eklendi.
- Kullanıcı ve rol hedefli bildirim kayıtları okunabilir hale geldi.

#### FAZ 10.2 — Olay bazlı bildirim kayıtları

- Duyuru oluşturulunca ilgili role bildirim oluşturulur.
- Ödeme kaydı oluşturulunca ilgili veliye bildirim oluşturulur.
- Kurum Zili gönderilince admin / öğretmen tarafına bildirim oluşturulur.
- Mesaj gönderilince alıcı kullanıcıya bildirim oluşturulur.

#### FAZ 10.3 — Push notification altyapısı

- Expo push token alma akışı eklendi.
- Kullanıcı kaydına token yazma mantığı hazırlandı.
- Bildirim kaydı sırasında uygun hedef tokenlara push gönderme altyapısı eklendi.
- Fiziksel cihazda izin / token / push teslim testi gerekir.

### FAZ 11 — Başarı Toast Sistemi

Klasik başarılı işlem alertleri yerine kısa süreli başarı toast sistemi eklendi.

Dosya:

```txt
src/components/AppSuccessToast.js
```

Toast eklenen ekranlar:

- Admin duyuru formu
- Admin ödeme formu
- Admin çocuk formu
- Admin sınıf formu
- Admin veli formu
- Veli medikal ekranı
- Veli profil ekranı
- Öğretmen günlük rapor ekranı

---

## Build Öncesi Son Kontrol

Build almadan önce şu akışlar gerçek cihazda test edilmelidir:

1. Admin giriş.
2. Öğretmen giriş.
3. Veli giriş.
4. Admin Galeri açılışı.
5. Öğretmen Galeri açılışı.
6. Fotoğraf yükleme.
7. Video yükleme.
8. Veli galeri görüntüleme.
9. İstatistikler ekranı: Genel / Öğretmenler / Çocuklar / Riskler.
10. Veli profilinden yasal metinler.
11. Öğretmen profilinden yasal metinler.
12. Admin kurum bilgilerinden yasal metinler.
13. Login ekranından yasal metinler.
14. Ödeme / anket / kurum zili temel ekran açılışları.
15. Uygulama kapat-aç sonrası tekrar giriş.
16. Admin duyuru oluşturunca toast görünür.
17. Admin ödeme oluşturunca toast görünür.
18. Admin çocuk / sınıf / veli formu kaydedince toast görünür.
19. Veli medikal ekranında kayıt sonrası toast görünür.
20. Veli profil fotoğrafı yükleme / kaldırma sonrası toast görünür.
21. Öğretmen günlük rapor kaydedince toast görünür.
22. Parent rapor ekranı sadece rapor görüntüleme ekranı olarak kalır.
23. Teacher rapor ekranı rapor oluşturma ekranı olarak kalır.
24. Admin / öğretmen / veli bildirim ekranları açılır.
25. Fiziksel cihazda push token kaydı kontrol edilir.
26. Fiziksel cihazda push bildirim testi yapılır.

---

## Sıradaki Kritik Fazlar

### FAZ 12 — Firebase Güvenlik Kuralları

- `kresId` bazlı veri izolasyonu.
- Yönetici/öğretmen/veli rol kontrolü.
- Galeri Storage erişim kuralları.
- Mesaj ve çocuk verisi erişim kısıtları.
- Bildirim node erişim kısıtları.
- Production güvenlik testi.

### FAZ 13 — Admin Aylık Yemek Listesi

Amaç: Yönetici aylık yemek planı girebilsin, sistem bugünün menüsünü veli tarafına otomatik çeksin.

Planlanan akış:

- Admin ay/yıl seçer.
- 30/31 günlük tablo açılır.
- Her gün için kahvaltı / öğle / ara öğün girilir.
- `Ayı Yayınla` butonu ile her gün için `yemekListeleri` altına günlük kayıt basılır.
- Mevcut veli yemek listesi ekranı tarih eşleşmesiyle bugünün menüsünü gösterir.
- Öğretmen isterse günlük listeyi düzenleyebilir.

Firebase önerisi:

```txt
yemekListeleri/{id}
  kresId
  sinifId: null | string
  tip: gunluk
  kaynak: aylik_plan
  tarih: YYYY-MM-DD
  baslik
  ogunler
    kahvalti
    ogle
    araOgun
  aktif
  createdAt
  updatedAt
```

A4/PDF planı:

- İlk sürümde sadece ek belge olarak yüklenebilir.
- OCR/AI ile otomatik okuma sonraki faza bırakılır.
- Otomatik okuma yapılırsa mutlaka yönetici onay ekranı olmalıdır.

### FAZ 14 — Tema Sistemini Tam Yayma

- Admin ekranlarında tema arka planı görünmeli.
- Öğretmen ekranlarında tema arka planı görünmeli.
- Admin tema değiştirirken kendi ekranında da anlık görmeli.
- Kreşe bağlı veli/öğretmen ekranları seçilen temayı otomatik almalı.

### FAZ 15 — Android Sistem Navigasyon Butonlarını Gizleme

- Android navigation bar davranışı test edilecek.
- `expo-navigation-bar` ile immersive / overlay davranışı değerlendirilecek.
- Aşağıdan yukarı kaydırınca butonların görünmesi, işlem yoksa tekrar gizlenmesi hedeflenir.

### FAZ 16 — Galeri Otomatik Storage Temizliği

- Firebase Cloud Functions scheduled cleanup.
- 24 saatten eski `galeri` kayıtlarını silme.
- Storage dosyalarını fiziksel silme.
- Hata loglama.

### FAZ 17 — Play Store Build / Kapalı Test

- Codemagic Android release build.
- Android release test.
- Kapalı test kullanıcıları.
- Crash kontrolü.
- Play Console veri güvenliği formu.
- Üretim hazırlığı.

---

## Notlar

- Mevcut galeri 24 saatten eski kayıtları uygulamada göstermeyecek şekilde tasarlanmıştır.
- Storage’dan garantili silme için Cloud Functions sonraki fazda yapılmalıdır.
- Yasal metinler uygulama içine eklenmiştir; ticari kullanım öncesinde hukuk danışmanı kontrolü önerilir.
- Build öncesi `npx expo start --clear` ile gerçek cihaz testi yapılmalıdır.
- Push bildirim kod altyapısı hazır olsa da fiziksel cihaz testi yapılmadan üretim hazır kabul edilmemelidir.
- Aylık yemek listesi modülü, mevcut `yemekListeleri` yapısına uyumlu şekilde yapılmalıdır.
