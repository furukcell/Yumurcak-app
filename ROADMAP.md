# Yumurcak Kreş Yol Haritası

Bu dosya build öncesi ve sonrası yapılacak işleri fazlara ayırır.

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

### FAZ 5 — Build Öncesi Stabilizasyon

- Veli ekranları crash risklerine karşı güçlendirildi.
- Admin ekranları crash risklerine karşı güçlendirildi.
- Route/import kontrolleri yapıldı.
- Build öncesi test listesi eklendi.

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

## Sıradaki Kritik Fazlar

### FAZ 9 — RevenueCat / Abonelik Ödeme

- RevenueCat kurulumu.
- Android ürün/paket eşleşmeleri.
- Admin abonelik ekranı ile RevenueCat bağlantısı.
- Demo / aylık / yıllık paket kontrolü.
- Abonelik bitince kilit ekranı.

### FAZ 10 — Bildirimler

- Push notification altyapısı.
- Günlük rapor bildirimi.
- Kurum Zili bildirimi.
- Duyuru bildirimi.
- Anket bildirimi.
- Ödeme hatırlatma bildirimi.

### FAZ 11 — Firebase Güvenlik Kuralları

- `kresId` bazlı veri izolasyonu.
- Yönetici/öğretmen/veli rol kontrolü.
- Galeri Storage erişim kuralları.
- Mesaj ve çocuk verisi erişim kısıtları.
- Production güvenlik testi.

### FAZ 12 — Galeri Otomatik Storage Temizliği

- Firebase Cloud Functions scheduled cleanup.
- 24 saatten eski `galeri` kayıtlarını silme.
- Storage dosyalarını fiziksel silme.
- Hata loglama.

### FAZ 13 — Play Store Build / Kapalı Test

- Expo/EAS veya Codemagic build.
- Android release test.
- Kapalı test kullanıcıları.
- Crash kontrolü.
- Play Console veri güvenliği formu.
- Üretim hazırlığı.

## Notlar

- Mevcut galeri 24 saatten eski kayıtları uygulamada göstermeyecek şekilde tasarlanmıştır.
- Storage’dan garantili silme için Cloud Functions sonraki fazda yapılmalıdır.
- Yasal metinler uygulama içine eklenmiştir; ticari kullanım öncesinde hukuk danışmanı kontrolü önerilir.
- Build öncesi `npx expo start --clear` ile gerçek cihaz testi yapılmalıdır.
