# Yumurcak Kreş

**Yumurcak Kreş**, kreş yönetimi, öğretmen ve veli iletişimini tek uygulamada toplayan React Native / Expo tabanlı mobil kreş takip uygulamasıdır.

Uygulama şu an fikir aşamasını geçmiş, **çalışan MVP + SaaS altyapısı** seviyesine gelmiştir. Ana odak artık yeni özellik eklemekten çok; gerçek cihaz testi, veri alanı eşleştirme, Firebase güvenlik kuralları, pilot kreş demosu ve stabil build sürecidir.

---

## Güncel Ürün Özeti

Yumurcak dört ana rol üzerinden çalışır:

| Rol | Açıklama |
| --- | --- |
| `superadmin` | Platform sahibi. Kreşleri, abonelikleri, demo süreçlerini ve veri bakımını yönetir. |
| `yonetici` | Kurum yöneticisi. Sınıf, çocuk, öğretmen, veli, duyuru, ödeme, ders programı, etkinlik, tema ve abonelik süreçlerini yönetir. |
| `ogretmen` | Kendi sınıfındaki çocuklar için günlük rapor girer, yoklama alır, velilerle ve yönetimle mesajlaşır. |
| `veli` | Kendi çocuğunun günlük özetini, raporlarını, yoklamasını, menüsünü, etkinliklerini, anketlerini, ödemelerini ve mesajlarını görür. |

---

## Güncel Durum

### Çalışan / Eklenmiş Ana Yapılar

- Android APK build süreci Codemagic üzerinden alınabiliyor.
- Expo / React Native tabanlı mobil uygulama iskeleti çalışıyor.
- Firebase Realtime Database bağlantısı var.
- Firebase Auth hibrit geçiş sistemi kuruldu.
- Eski kullanıcı adı / şifre fallback sistemi korunuyor.
- Firebase Storage profil fotoğrafı altyapısı eklendi.
- Rol bazlı yönlendirme çalışıyor.
- Süper Admin, Yönetici, Öğretmen ve Veli panelleri ayrılmış durumda.
- Abonelik guard sistemi var.
- Abonelik pasifse yönetici ödeme/abonelik ekranına, veli/öğretmen kilit ekranına yönleniyor.
- Mesajlaşma sistemi yönetici, öğretmen ve veli tarafında mevcut.
- Günlük rapor, yoklama, yemek listesi, duyuru, etkinlik, medikal bilgi, galeri, belgeler ve servis ekranları mevcut.
- Kreş bazlı tema sistemi eklendi.
- Yönetici tema seçebiliyor.
- Veli/öğretmen/admin ekranları ThemeProvider ile sarılıyor.
- Veli tarafına alt tab bar eklendi.
- Veli ilk açılış ekranı `Özet` olarak düzenlendi.
- Veli `Özet` ekranı günlük rapor, yoklama, yemek listesi, ders programı, etkinlik, duyuru, ödeme ve anketlerden otomatik özet üretir.
- Kurum Zili ekranı eklendi.
- Ödeme Takibi ekranı eklendi.
- Anketler / Oylamalar ekranı eklendi.

---

## Veli Paneli Güncel Yapı

Veli tarafında artık ana deneyim alt tab üzerinden ilerler:

```txt
📊 Özet
🏠 Anasayfa
📋 Raporlar
📈 Gelişim
💬 Mesaj
```

### 1. Özet

İlk giriş ekranıdır. Veli uygulamayı açınca önce burayı görür.

Özet ekranı şu verileri Firebase’den otomatik okur:

```txt
gunlukRaporlar/
yemekListeleri/
yoklamalar/
etkinlikler/
duyurular/
dersProgramlari/
odemeler/
anketler/
```

Gösterdiği bilgiler:

- Bugünün ruh hali
- Giriş / yoklama durumu
- Uyku bilgisi
- Kahvaltı / öğle / ara öğün yedi-yemedi durumu
- Günün menüsü
- Günün ders programı
- Günün etkinlikleri
- Öğretmen notu
- Son duyuru
- Bekleyen ödeme uyarısı
- Cevap bekleyen anket uyarısı
- Kurum Zili hızlı butonu
- Mesaj hızlı butonu
- Aylık gelişim raporu geçiş kartı

### 2. Anasayfa

Anasayfa artık özet değil, işlem merkezidir.

Kart yapısı:

```txt
🔔 Kurum Zili
💳 Ödeme Takibi
🗳️ Anketler
☎️ Kurum İletişim
📋 Günlük Rapor
✅ Yoklama
🍽️ Yemek Listesi
🎉 Etkinlikler
🩺 Medikal
🚌 Servis
🖼️ Galeri
📁 Belgeler
```

### 3. Raporlar

Günlük rapor geçmişi ve çocuk raporu ekranlarına erişim sağlar.

### 4. Gelişim

Aylık gelişim raporu ve ileride AI yorumlu istatistiklerin ana yeri olacaktır.

Planlanan yapı:

- Aylık AI yorum
- Katılım istatistiği
- Ruh hali dağılımı
- Uyku ortalaması
- Yemek düzeni
- Etkinlik katılımı
- Önceki aylarla karşılaştırma

### 5. Mesaj

Veli ile öğretmen / kurum yönetimi arasındaki mesajlaşma alanıdır.

---

## Yeni Eklenen Modüller

### Kurum Zili

Dosya:

```txt
src/screens/parent/ParentBellScreen.js
```

Veli iki farklı teslim türü seçebilir:

```txt
👋 Alacağım
🏫 Bırakacağım
```

İki ana aksiyon vardır:

```txt
🚗 GELİYORUM
📍 KAPIDAYIM
```

Firebase’e şu mantıkla kayıt atılır:

```txt
kurumZili/{autoId}
  kresId
  cocukId
  cocukAdi
  veliId
  veliAdi
  teslimTuru
  durum: geliyorum / kapidayim
  okundu: false
  createdAt
```

### Ödeme Takibi

Dosya:

```txt
src/screens/parent/ParentPaymentsScreen.js
```

`odemeler/` node’undan çocuğa veya veliye bağlı ödeme kayıtlarını listeler.

Şimdiki durum:

- Aidat / ücret tab görünümü var.
- Ödeme kartı gösterir.
- Durum: bekliyor / ödendi.
- IBAN butonu yer tutucu olarak duruyor.

Eksik:

- Yönetici tarafında ödeme oluşturma akışı netleştirilmeli.
- IBAN bilgisi `kresler/{kresId}` veya ayrı ayar node’undan gerçek veriyle çekilmeli.
- Ödeme dekontu yükleme daha sonra eklenebilir.

### Anketler / Oylamalar

Dosya:

```txt
src/screens/parent/ParentPollsScreen.js
```

`anketler/` node’undan aktif anketleri okur. Veli cevap verince:

```txt
anketler/{anketId}/cevaplar/{veliId}
  secenek
  veliId
  createdAt
```

altına kayıt atılır.

Eksik:

- Yönetici tarafında anket oluşturma ekranı henüz tamamlanmalı.
- Anket sonuç ekranı yönetici tarafına eklenmeli.
- Tek cevap / çoklu cevap kuralı netleştirilmeli.

---

## Tema Sistemi

Tema sistemi kreş bazlıdır. Kullanıcı bazlı değil, kurum bazlı çalışır.

Dosyalar:

```txt
src/theme/themes.js
src/theme/ThemeProvider.js
src/components/ThemedBackground.js
src/screens/admin/AdminThemeScreen.js
src/theme/useThemedStyles.js
```

Tema verisi şu alandan okunur:

```txt
kresler/{kresId}/temaId
kresler/{kresId}/temaAyarlari
```

Admin tema seçtiğinde aynı kreşe bağlı veli / öğretmen / yönetici ekranları aynı temayı kullanır.

Mevcut tema seçenekleri:

```txt
Yumurcak Mor
Orman Dostları
Mercan Resif
Çiftlik Bahçesi
Gökyüzü Maceraları
Bal Arısı
Dinozor Vadisi
Denizaltı Dünyası
Pamuk Şeker
Uzay Kaşifleri
```

Not: `src/theme/themeContextPlain.js` dosyası eski deneme dosyasıdır. Kullanılmıyorsa temizlenebilir.

---

## Firebase Veri Modeli

Temel node yapısı:

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
anketler/
kurumZili/
```

Index node yapısı:

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

---

## Kritik Test Senaryosu

Build almadan veya pilot demoya çıkmadan önce şu akış gerçek cihazda test edilmeli:

1. Süper Admin yeni kreş oluşturur.
2. Demo abonelik başlatır.
3. Kurum yöneticisi giriş yapar.
4. Sınıf oluşturur.
5. Öğretmen oluşturur ve sınıfa bağlar.
6. Veli oluşturur.
7. Çocuk oluşturur ve veli/sınıf/kresId bağlantısı yapılır.
8. Öğretmen günlük rapor girer.
9. Öğretmen yoklama alır.
10. Yönetici yemek listesi girer.
11. Yönetici ders programı girer.
12. Yönetici etkinlik / duyuru girer.
13. Veli giriş yapar.
14. Özet ekranında tüm bilgiler doğru doluyor mu kontrol edilir.
15. Kurum Zili bildirimi gönderilir.
16. Anket cevabı verilir.
17. Ödeme ekranı kontrol edilir.
18. Veli/öğretmen/yönetici mesajlaşması test edilir.
19. Tema seçilip veli ve öğretmen ekranlarına yansıması kontrol edilir.
20. Çıkış / tekrar giriş / loading / boş veri durumları test edilir.

---

## Bilinen Riskler ve Eksikler

### Yüksek Öncelik

- Yeni eklenen Özet, Kurum Zili, Ödeme ve Anket ekranları gerçek cihazda henüz uçtan uca test edilmelidir.
- Firebase alan adları gerçek kayıt yapısıyla birebir eşleşmeyebilir. Özet ekranında boş görünen alanlar için veri field eşleştirmesi yapılmalıdır.
- `odemeler` için veli/çocuk bağlantı standardı netleşmeli.
- `anketler` için yönetici oluşturma ve sonuç görme ekranı tamamlanmalı.
- `kurumZili` kayıtlarını yönetici/öğretmen tarafında görecek ekran veya bildirim paneli eklenmeli.
- Production Firebase Rules uygulanmadan önce Firebase Auth geçişi tamamen tamamlanmalı.
- Düz metin şifre fallback sistemi uzun vadede kaldırılmalı.

### Orta Öncelik

- Tüm detay ekranları tema renklerine tam bağlanmalı.
- ThemedBackground desen sistemi görsel olarak geliştirilmeli.
- Boş veri ekranları standartlaştırılmalı.
- Loading ve disabled button state’leri tüm kayıt ekranlarında kontrol edilmeli.
- Admin ödeme, ders programı, yemek listesi, etkinlik ve anket oluşturma ekranları saha kullanımına göre sadeleştirilmeli.
- Push notification henüz yok; Kurum Zili için ileride bildirim gerekir.

### Düşük Öncelik

- Web panel.
- App Store yayını.
- Muhasebe / e-fatura entegrasyonu.
- RevenueCat veya online ödeme.
- Çoklu dil.

---

## Build ve Test

Önerilen lokal kontrol:

```bash
npm install
npx expo-doctor
npx expo start --clear
```

Android release için Codemagic kullanılabilir. Build almadan önce Metro’da kırmızı hata olup olmadığı kontrol edilmelidir.

---

## Güncel Yol Haritası

Detaylı yol haritası ayrıca şu dosyada tutulur:

```txt
YUMURCAK_YOL_HARITASI.md
```

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

> Yumurcak artık çalışan MVP + SaaS altyapısı seviyesinde. Pilot kreş demosuna yaklaşmıştır; ancak ücretli müşteri öncesi gerçek cihaz testi, Firebase veri alanı eşleştirme, Auth/Rules geçişi ve yeni veli modüllerinin yönetici tarafındaki karşılıkları tamamlanmalıdır.
