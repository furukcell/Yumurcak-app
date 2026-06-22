# Yumurcak Build Öncesi Test Listesi

Bu dosya, build almadan önce uygulamada tek tek denenmesi gereken kritik akışları toplar.
Amaç yeni özellik eklemek değil; kırmızı hata, route/import hatası, boş veri hatası ve Firebase veri uyumsuzluklarını yakalamaktır.

> Test sırasında kırmızı hata, donma veya boş beyaz ekran görülürse ekran görüntüsü alınmalı ve ilgili adım not edilmelidir.

---

## 1. Başlangıç kontrolü

- [ ] `npm install --legacy-peer-deps` sorunsuz çalışıyor.
- [ ] `npx expo start --clear` ile uygulama açılıyor.
- [ ] Metro ekranında import/export hatası yok.
- [ ] Uygulama ilk açılışta kırmızı hata vermiyor.
- [ ] Login ekranı geliyor.

---

## 2. Giriş / rol kontrolü

### Yönetici

- [ ] Yönetici hesabıyla giriş yapılabiliyor.
- [ ] Yönetici paneli açılıyor.
- [ ] Yönetici panelindeki kartlar görünüyor.
- [ ] Çıkış yapılıp tekrar giriş yapılabiliyor.

### Veli

- [ ] Veli hesabıyla giriş yapılabiliyor.
- [ ] Veli paneli açılıyor.
- [ ] Alt tab menüsü görünüyor.
- [ ] Çıkış yapılıp tekrar giriş yapılabiliyor.

### Öğretmen

- [ ] Öğretmen hesabıyla giriş yapılabiliyor.
- [ ] Öğretmen paneli açılıyor.
- [ ] Çıkış yapılıp tekrar giriş yapılabiliyor.

---

## 3. Veli ekranları

### Özet

- [ ] Veli → Özet ekranı açılıyor.
- [ ] Çocuk bilgisi görünüyor.
- [ ] Günlük rapor varsa görünüyor.
- [ ] Yemek listesi varsa görünüyor.
- [ ] Yoklama bilgisi varsa görünüyor.
- [ ] Etkinlik / duyuru varsa görünüyor.
- [ ] Veri yoksa kırmızı hata yerine boş durum mesajı görünüyor.

### Anasayfa

- [ ] Veli → Anasayfa açılıyor.
- [ ] Ana kartlar düzgün görünüyor.
- [ ] Kurum Zili kartı açılıyor.
- [ ] Ödemeler kartı açılıyor.
- [ ] Anketler kartı açılıyor.

### Gelişim

- [ ] Veli → Gelişim tabı açılıyor.
- [ ] Aylık gelişim özeti görünüyor.
- [ ] Önceki ay / sonraki ay butonları çalışıyor.
- [ ] Katılım özeti görünüyor.
- [ ] Ruh hali özeti görünüyor.
- [ ] Uyku özeti görünüyor.
- [ ] Yemek özeti görünüyor.
- [ ] Etkinlik özeti görünüyor.
- [ ] Yumurcak yorumu görünüyor.
- [ ] Fiziksel gelişim kartı görünüyor.
- [ ] Son boy ve kilo görünüyor.
- [ ] Boy/kilo geçmiş listesi görünüyor.
- [ ] Grafik gibi bar görünümü görünüyor.
- [ ] Boy/kilo kaydı yoksa kırmızı hata yok.

### Ödemeler

- [ ] Veli → Ödemeler ekranı açılıyor.
- [ ] Bekleyen ödeme görünür.
- [ ] Ödendi ödeme görünür.
- [ ] Geciken ödeme görünürse doğru etiketlenir.
- [ ] Ödeme yoksa boş durum mesajı görünür.
- [ ] Eski alan adlarıyla gelen kayıtlar patlatmaz: `cocukId`, `childId`, `veliId`, `parentId`, `veliIds`, `parentIds`.

### Anketler

- [ ] Veli → Anketler ekranı açılıyor.
- [ ] Aktif anket görünüyor.
- [ ] Seçenekler görünüyor.
- [ ] Oy verilebiliyor.
- [ ] Oy verdikten sonra tekrar oy verme engelleniyor veya uygun mesaj çıkıyor.
- [ ] Seçenek formatı bozuksa kırmızı hata yerine uyarı çıkıyor.
- [ ] Anket yoksa boş durum mesajı çıkıyor.

### Kurum Zili

- [ ] Veli → Kurum Zili ekranı açılıyor.
- [ ] Geliyorum bildirimi gönderilebiliyor.
- [ ] Kapıdayım bildirimi gönderilebiliyor.
- [ ] Çocuk / kurum bilgisi eksikse kırmızı hata yerine uyarı çıkıyor.
- [ ] Gönder butonuna hızlı hızlı basınca çift kayıt riski oluşmuyor.

### Mesaj

- [ ] Veli → Mesaj ekranı açılıyor.
- [ ] Mesaj listesi boşsa ekran patlamıyor.
- [ ] Mevcut mesajlar varsa görünüyor.

---

## 4. Yönetici ekranları

### Yönetici paneli

- [ ] Yönetici paneli açılıyor.
- [ ] Ödemeler kartı `PaymentList` ekranına gidiyor.
- [ ] Anket Yönetimi kartı `PollManagement` ekranına gidiyor.
- [ ] Kurum Zili kartı `AdminBell` ekranına gidiyor.
- [ ] Tema Ayarları kartı açılıyor.

### Ödeme Yönetimi

- [ ] Yönetici → Ödemeler ekranı açılıyor.
- [ ] Ödeme listesi görünüyor.
- [ ] Ödeme yoksa boş durum mesajı çıkıyor.
- [ ] Yeni ödeme oluşturma ekranı açılıyor.
- [ ] Çocuk seçilebiliyor.
- [ ] Tutar yazılabiliyor.
- [ ] Ay/yıl bilgisi girilebiliyor.
- [ ] Ödeme kaydı oluşturuluyor.
- [ ] Oluşturulan ödeme veli ekranında görünüyor.
- [ ] Yönetici ödeme kaydını `Ödendi` yapabiliyor.
- [ ] Veli ekranında ödeme `Ödendi` görünüyor.

### Anket Yönetimi

- [ ] Yönetici → Anket Yönetimi ekranı açılıyor.
- [ ] Yeni anket oluşturulabiliyor.
- [ ] Seçenekler satır satır girilebiliyor.
- [ ] Anket aktif olarak yayınlanıyor.
- [ ] Veli ekranında anket görünüyor.
- [ ] Veli cevap veriyor.
- [ ] Yönetici sonuçları görebiliyor.
- [ ] Anket aktif/pasif yapılabiliyor.
- [ ] Anket silinebiliyor.

### Kurum Zili Yönetimi

- [ ] Yönetici → Kurum Zili ekranı açılıyor.
- [ ] Veli tarafından gönderilen bildirim görünüyor.
- [ ] Geliyorum / Kapıdayım türü doğru görünüyor.
- [ ] Çocuk adı görünüyor.
- [ ] Veli adı görünüyor.
- [ ] Okundu yapılabiliyor.
- [ ] Tamamlandı yapılabiliyor.
- [ ] Boş liste durumunda ekran patlamıyor.

### Tema Ayarları

- [ ] Yönetici → Tema Ayarları açılıyor.
- [ ] 10 tema görünüyor.
- [ ] Tema değiştirilebiliyor.
- [ ] Seçilen tema veli ekranına yansıyor.
- [ ] Arka plan PNG görünüyor.
- [ ] Arka plan yazıları okunmaz hale getirmiyor.

---

## 5. Öğretmen ekranları

- [ ] Öğretmen ana paneli açılıyor.
- [ ] Günlük rapor girilebiliyor.
- [ ] Yoklama girilebiliyor.
- [ ] Yemek bilgisi girilebiliyor.
- [ ] Etkinlik / duyuru girilebiliyor.
- [ ] Girilen bilgiler veli Özet ve Gelişim ekranlarında görünür.

---

## 6. Firebase veri kontrolü

Aşağıdaki node'larda veri varsa ekranlar patlamadan okumalıdır:

- [ ] `gunlukRaporlar`
- [ ] `yoklamalar`
- [ ] `yemekListeleri`
- [ ] `etkinlikler`
- [ ] `duyurular`
- [ ] `dersProgramlari`
- [ ] `odemeler`
- [ ] `anketler`
- [ ] `kurumZili`
- [ ] `fizikselGelisim`
- [ ] `children`
- [ ] `users`

Alan adı toleransı kontrolü:

- [ ] `cocukId` / `childId`
- [ ] `veliId` / `parentId`
- [ ] `veliIds` / `parentIds`
- [ ] `kresId` / `kurumId`
- [ ] `durum` / `status`
- [ ] `baslik` / `title`
- [ ] `tutar` / `amount`
- [ ] `tarih` / `createdAt`

---

## 7. Boş veri testi

Aşağıdaki durumlarda uygulama kırmızı hata vermemelidir:

- [ ] Çocuğa ait günlük rapor yok.
- [ ] Çocuğa ait ödeme yok.
- [ ] Aktif anket yok.
- [ ] Kurum zili bildirimi yok.
- [ ] Boy/kilo kaydı yok.
- [ ] Etkinlik kaydı yok.
- [ ] Yemek listesi yok.
- [ ] Yoklama kaydı yok.
- [ ] Kullanıcıda eksik profil alanı var.

---

## 8. Build öncesi komutlar

Sırasıyla çalıştır:

```bash
npm install --legacy-peer-deps
npx expo start --clear
```

Expo açıldıktan sonra telefonda veya emülatörde yukarıdaki testleri yap.

Kırmızı hata yoksa build hazırlığına geç:

```bash
npx expo prebuild --clean --platform android
```

Codemagic kullanılacaksa, son commit GitHub'da olduğundan emin ol.

---

## 9. Build almadan önce karar

Build alınabilir demek için aşağıdaki maddeler tamam olmalı:

- [ ] Uygulama açılışta hata vermiyor.
- [ ] Yönetici girişi çalışıyor.
- [ ] Veli girişi çalışıyor.
- [ ] Öğretmen girişi çalışıyor.
- [ ] Ödeme akışı uçtan uca çalışıyor.
- [ ] Anket akışı uçtan uca çalışıyor.
- [ ] Kurum Zili akışı uçtan uca çalışıyor.
- [ ] Gelişim ekranı açılıyor.
- [ ] Tema sistemi çalışıyor.
- [ ] Boş veri ekranları patlamıyor.

---

## 10. Hata çıkarsa not formatı

Hata çıkarsa şu şekilde not al:

```text
Ekran: Veli > Gelişim
İşlem: Önceki aya bastım
Hata: Cannot read property 'map' of undefined
Ekran görüntüsü: var/yok
```

Bu formatla hata daha hızlı düzeltilir.
