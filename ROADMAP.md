# Yumurcak Kreş — Yol Haritası

Bu dosya, önceden ayrı ayrı tutulan üç yol haritasının (ROADMAP.md, YUMURCAK_YOL_HARITASI.md, dökümanlar modülü yol haritası) harmanlanmış, tek ve güncel halidir.

> Son güncelleme: 6 Ağustos 2026

---

## 1. Genel Durum

Yumurcak Kreş **Google Play'de yayında**. Admin, öğretmen ve veli tarafındaki ana modüller ile dökümanlar/PDF modülü büyük ölçüde tamamlanmıştır. Yeni özellik geliştirme tarafında canlıyı engelleyen ana bir iş kalmamıştır.

Güncel öncelik sırası:

```txt
1. App Store (iOS) sürümünün hazırlanması
2. Pilot kreşlere demo sunumu
3. RevenueCat / Google Play gerçek satın alma + restore testi
4. Firebase Rules son güvenlik kontrolü
5. İlk kullanıcı geri bildirimlerinin toplanması
6. Yapay zeka destekli günlük özet metni (bkz. Faz 21 — yeni)
```

---

## 2. Tamamlanan Ana Fazlar (Özet)

### Temel Uygulama ve Paneller

- Expo / React Native temel yapı, Firebase Auth rol bazlı giriş, Realtime Database + Storage altyapısı
- Yönetici, öğretmen, veli, superadmin panelleri
- Kurum / sınıf / çocuk / öğretmen / veli yönetimi
- Veli özet ekranı, veli/öğretmen anasayfa, admin dashboard
- Tema sistemi + sınıf bazlı tema (`ThemedBackground`, `kresler/{kresId}/sinifTemalari/{sinifId}`)
- Pastel kart tasarımına geçiş (admin/öğretmen/veli)
- Başarı toast sistemi (`AppSuccessToast`) — form kaydetme akışlarının tamamında
- Android navigation bar davranışı, klavye/scroll düzeltmeleri

### Günlük Takip

- Öğretmen günlük rapor ekranı: ruh hali, öğün detayları (kahvaltı/öğle/ara öğün → yemedi/az_yedi/bitirdi), uyku süresi, tuvalet sayısı, öğretmen notu
- Yoklama sistemi
- Fiziksel gelişim kaydı + veli tarafında Aylık Gelişim / Sınıf Ortalaması (anonim, min. 5 çocuk şartı)
- 30 günlük Uyum Modülü (yeni başlayan çocuklar), öğretmen Uyum Takibi, veli Uyum Skoru
- Haftanın Yıldızı / Rozet sistemi (`haftaninRozetleri`, sadece ilgili veliye görünür)

### Galeri

- Ortak `GalleryScreenBase` altyapısı (admin/öğretmen/veli)
- Fotoğraf/video yükleme, çoklu medya, otomatik optimizasyon (1920px/%80 kalite foto, ~720p/50MB video)
- 24 saatlik `expiresAt` görünürlük kuralı
- Uygulama içi görüntüleme/oynatma, cihaz galerisine kaydetme
- **Kalan opsiyonel iş:** Storage'dan fiziksel silme için scheduled Cloud Function (şu an sadece uygulama içi gizleme var)

### İletişim ve Operasyon

- Hedefli duyuru sistemi (kurum / veli / öğretmen / sınıf)
- Anket / oylama sistemi, mesajlaşma, Kurum Zili
- Ödeme takibi (admin liste+form, veli görüntüleme)
- Uygulama içi bildirim merkezi + Cloud Functions push sistemi (bkz. README.md)
- Medikal bilgi takibi
- Yasal metinler (Kullanım Şartları, Gizlilik Politikası, KVKK Aydınlatma Metni)

### Abonelik

- RevenueCat SDK + Android public key, `default` offering, `YUMURCAK Pro` entitlement
- Google Play abonelik ürünleri ve package eşleşmeleri
- Admin abonelik ekranı sadeleştirildi, manuel aktif etme kaldırıldı (canlı risk)
- **Kalan:** gerçek cihazda satın alma + restore testi, Firebase abonelik kaydı doğrulaması

### Dökümanlar / Aylık Belgeler Modülü ✅ TAMAMLANDI (Faz 0-9)

> Bu bölüm eski `yumurcak-dokumanlar-yol-haritasi-guncel.md` dosyasından harmanlandı.

- **Faz 0-2:** Veri modeli birleştirildi — `dersProgramlari` da `yemekListeleri` gibi gün-bazlı kayıt yapısına taşındı. Ortak `monthlyDocuments.js` servisi + Liste/Takvim toggle (`MonthlyCalendarView`) kuruldu. Taslak → `Ayı Yayınla`/`Yayından Kaldır` akışı standart hale getirildi.
- **Faz 3:** PDF/şablon render servisi (`documentPdf.js`, `expo-print` + `expo-sharing`). Kurum bilgisi (`kresler/{kresId}`) otomatik çekiliyor. `MonthlyDocumentPdfBar` bileşeni admin + öğretmen + veli tarafına bağlandı (tek renderer, tek buton mantığı).
- **Faz 4:** Otomatik besleme — öğretmen ders programı ekranı kendi sınıfına otomatik bağlandı, "Bugün" kartı eklendi; veli özet ekranındaki günlük etkinlik gösterimi düzeltildi.
- **Faz 5:** Geçen Ayı Kopyala + aylık/yayın bazlı Arşiv (`MonthlyArchivePicker`, `listPublishedMonths`).
- **Faz 6:** Eski A4-fotoğraf `dokumanlar` sistemi tamamen kaldırıldı (kreş henüz canlı değildi, iki paralel sistem tutmaya gerek kalmadı).
- **Faz 7:** Etkinlik Kütüphanesi — kreşler arası anonim `etkinlikHavuzu` (client sadece okur, Cloud Function günceller), autocomplete, yaş grubu standardizasyonu (`YAS_GRUPLARI`).
- **Faz 8:** Yemek Kütüphanesi (`yemekHavuzu`, aynı anonim mimari) + 7 yeni belge şablonu: Aylık Bülten, Nöbet Çizelgesi, Personel Görev Listesi, Servis Listesi, Doğum Günü Takvimi (hesaplanan), Gezi Formu, İlaç Takip Formu (sağlık belgesi — veli onayı uyarısı var, engellemiyor).
- **Faz 9:** Öğretmen verimlilik araçları — günlük kontrol paneli, hazır duyuru şablonları, otomatik tamamlama.

**Kritik düzeltilen hata (Faz 3 sırasında bulundu):** `fetchNodeSnapshotOnce()` fonksiyonu Firebase kurallarına aykırı filtresiz okuma yapıyordu, bu yüzden `Yayından Kaldır` ve `Geçen Ayı Kopyala` sessizce çalışmıyordu. `kresId` bazlı sorguya çevrilerek düzeltildi — **ilk gerçek cihaz testi henüz yapılmadı, bir sonraki testte özellikle bu üç akışa (Yayından Kaldır, Geçen Ayı Kopyala, doğru pasife alma) bakılmalı.**

---

## 3. Build Öncesi / Canlı Öncesi Son Kontrol Listesi

Aşağıdaki akışlar gerçek cihazda test edilmelidir (henüz doğrulanmamış olanlar işaretli):

```txt
1.  Admin / Öğretmen / Veli giriş
2.  Admin sınıf/çocuk/öğretmen/veli bağlantı kontrolü
3.  Günlük rapor girişi → veli görür + push alır
4.  Yoklama girişi → veli görür + push alır
5.  Fiziksel gelişim kaydı → veli görür + push alır
6.  Uyum kaydı → veli Uyum Skoru'nu görür + push alır
7.  Haftanın Yıldızı verilir → veli Rozetlerim'de görür + push alır
8.  Galeri fotoğraf/video yükleme → veli görür + push alır, cihaza kaydetme
9.  Duyuru / Anket / Ödeme / Kurum Zili → hedef kullanıcı push alır
10. Mesaj gönderimi → karşı taraf push alır, yanlış hata alerti çıkmıyor
11. Bildirimler ekranında kayıtlar görünüyor, pushStatus: sent kontrolü
12. ⏳ RevenueCat paketleri gerçek cihazda görünüyor
13. ⏳ Google Play ödeme popup'ı açılıyor, satın alma sonrası entitlement aktif
14. ⏳ Restore testi
15. ⏳ Firebase Database Rules son kontrolü
16. ⏳ Firebase Storage Rules son kontrolü
17. ⏳ Android release build + Play Console kapalı test
18. ⏳ Dökümanlar modülü: Yayından Kaldır / Geçen Ayı Kopyala / Arşiv gerçek cihaz testi (yeni native bağımlılık expo-print nedeniyle önemli)
19. ⏳ İlaç Takip Formu veli onayı uyarı akışı
20. Sınıf teması aynı sınıftaki veli/öğretmen tarafına doğru yansıyor mu (sinifId boş kullanıcılar için çocuk/sınıf ilişkisinden bulunuyor mu)
```

---

## 4. Sıradaki Kritik Fazlar (Canlıya Yönelik)

### Faz A — Firebase Güvenlik Kuralları Son Kontrolü

- `kresId` bazlı veri izolasyonu, rol kontrolü (yönetici/öğretmen/veli)
- Galeri Storage erişim kuralları, mesaj/çocuk verisi erişim kısıtları
- Dökümanlar modülü node'larının (`yemekListeleri`, `dersProgramlari`, vb.) `orderByChild('kresId')` zorunluluğu doğrulanmalı
- Eski `dokumanlar` node kuralı temizliği (opsiyonel, düşük risk)

### Faz B — RevenueCat / Google Play Gerçek Test

- Google Play subscription ürünleri + RevenueCat service account bağlantısı
- Gerçek Android cihazda satın alma ve restore testi

### Faz C — Play Store Build / Kapalı Test

- Codemagic Android release build, crash kontrolü
- Play Console veri güvenliği formu, kapalı test kullanıcıları

### Faz D — App Store (iOS) Sürümü

- iOS build (Codemagic), App Store inceleme süreci

### Faz E — Galeri Otomatik Storage Temizliği (opsiyonel)

- Firebase Cloud Functions scheduled cleanup — 24 saatten eski `galeri` kayıtlarını Storage'dan fiziksel silme + hata loglama

---

## 5. Gelecek Fazlar — Ürün Geliştirme (henüz başlanmadı)

> Bu bölüm dökümanlar yol haritasının planlanan-ama-henüz-yapılmamış kısmı.

### Faz 10 — Akıllı Etkinlik Yönetimi

- **Etkinlik Dengesi Analizi:** Ay içindeki etkinlikleri kategori bazında sayıp eksik kategorileri öğretmene öneri olarak gösterme (kural tabanlı, yapay zeka kullanılmayacak)
- **Aynı Gün Geçen Yıl:** Geçen yıl aynı gün, aynı sınıfta yapılan etkinliği gösterme
- **Hazır Kazanımlar:** Etkinlik seçilince ilgili gelişim kazanımlarını önerme (örn. Parmak Boyası → İnce Motor, El-Göz Koordinasyonu)
- **Akıllı Tekrar Uyarısı:** Aynı etkinlik kısa sürede tekrar seçilirse bilgilendirme (engellemez)

### Faz 11 — Öğretmen Kişisel Kütüphanesi

- Favori etkinlikler, son kullanılanlar, kişisel etkinlik arşivi, kişisel arama
- Favorilerden plan oluşturma

### Faz 12 — Merkezi İçerik Platformu

- Kreşler arası anonim merkezi etkinlik havuzunun genişletilmesi: yaş grubu / kategori / tema filtreleme, en çok kullanılanlar, tek dokunuşla günlük rapora aktarma

---

## 6. Faz 21 — Yapay Zeka Destekli Günlük Özet Metni (YENİ)

> Bu faz, veli özet ekranındaki (`ParentSummaryScreen.js` → `buildDailyComment()`) kural tabanlı, şablon hissi veren günlük özet metnini gerçek bir dil modeliyle üretmeye taşımayı hedefler.

### Amaç

Öğretmenin `ChildReportScreen.js` üzerinden girdiği günlük veriyi (ruh hali, öğün durumu, uyku süresi, tuvalet sayısı, öğretmen notu) veliye şablon gibi değil, gerçek bir öğretmenin yazdığı gibi doğal, sıcak ve her gün farklı bir metinle sunmak.

### Mevcut Durumun Sorunu

Kural tabanlı cümle birleştirici üç noktada "yapay" hissettiriyor: öğretmen notu ayrı bir cümle olarak ekleniyor (anlatının içine yedirilmiyor), her gün aynı sırayla aynı iskelet kullanılıyor, cümle bağlaçları hep aynı kalıpta.

### Teknik Yaklaşım

```txt
Model: Google Gemini 2.5 Flash-Lite (Google AI Studio API)
Tetikleme: Firebase Cloud Function, günlük rapor kaydı oluştuğunda (createNotificationOnDailyReportCreate
           akışına benzer şekilde) veya günde bir kez zamanlı (scheduled) çalışacak şekilde
Girdi: gunlukRaporlar kaydından JSON (ruhHali, yemek, uyku, tuvalet, not) — çocuk adı yerine
       anonim/placeholder ID gönderilip metin döndükten sonra isim client veya function
       tarafında yerine yazılacak (KVKK / veri gizliliği önlemi)
Çıktı: Üretilen metin gunlukRaporlar kaydına (veya ayrı bir alan/node'a) yazılır,
       ParentSummaryScreen sadece bu hazır metni okur — client'ta API çağrısı YAPILMAZ
Cache: Çocuk başına günde 1 üretim; veli ekranı kaç kere açarsa açsın aynı metin okunur
```

### Neden Free Tier Yetmez, Ama Maliyet Önemsiz

Gemini free tier günlük istek kotası (~1.000/gün, Flash-Lite) küçük ölçekte yeterli olsa da, örneğin 100 kreş × 50 çocuk = 5.000 günlük istek senaryosunda kotanın 5 katı üzerinde kalır — production için billing açılması gerekir.

Paid tier maliyeti buna karşın önemsiz seviyede: Flash-Lite $0.10/1M input + $0.40/1M output token fiyatıyla, çocuk başına günlük ortalama ~400 token input + ~150 token output varsayımıyla, **5.000 çocuk ölçeğinde aylık maliyet ~15$ (çocuk başına ayda ~0.003$)** — bu, mevcut abonelik paketlerine (Başlangıç/Profesyonel/Kurum) sorunsuz gömülebilecek bir rakam.

### Yapılacaklar

```txt
[ ] Google AI Studio hesabı + API key alınması, billing açılması (kredi kartı gerekiyor
    ama free tier ile geliştirme/test kredi kartsız başlayabilir)
[ ] Firebase Cloud Function: buildDailyCommentWithAI (günlük rapor tetikleyicisi veya
    zamanlı toplu üretim)
[ ] Prompt tasarımı: sıcak, doğal, öğretmen dili; öğretmen notunun anlatı içine
    yedirilmesi; her gün farklı cümle yapısı
[ ] Çocuk ismi anonimleştirme / placeholder mekanizması (KVKK)
[ ] API hata / rate-limit durumunda eski kural tabanlı buildDailyComment()'e
    otomatik geri dönüş (fallback) — veli ekranı hiçbir zaman boş kalmamalı
[ ] Maliyet takibi: aylık token kullanımı için basit bir admin/superadmin
    izleme ekranı (opsiyonel)
[ ] Pilot kreşlerde A/B: kural tabanlı vs AI metni karşılaştırması
```

### Riskler / Dikkat Edilecekler

```txt
- Free tier data policy: Google, free-tier girdi/çıktıları model eğitiminde kullanabilir —
  production'da billing (paid tier, Vertex AI değilse dahi "prepay/postpay") şart.
- Çocuğa dair hassas veri (ruh hali, sağlık/tuvalet bilgisi) API'ye gönderileceği için
  isim anonimleştirme + KVKK aydınlatma metninin bu kullanımı kapsayacak şekilde
  güncellenmesi gerekiyor.
- Rate limit / API kesintisi senaryosunda mevcut kural tabanlı sistem fallback olarak
  KORUNMALI, silinmemeli.
```

---

## 7. Notlar

- Mevcut galeri 24 saatten eski kayıtları uygulamada göstermeyecek şekilde tasarlanmıştır; Storage'dan garantili silme sonraki fazda (Faz E) yapılmalıdır.
- Yasal metinler uygulama içine eklenmiştir; ticari kullanım öncesinde hukuk danışmanı kontrolü önerilir — özellikle Faz 21 (AI özet) devreye girerse KVKK metninin güncellenmesi gerekir.
- Build öncesi `npx expo start --clear` ile gerçek cihaz testi yapılmalıdır.
- Push bildirim kod altyapısı hazır olsa da fiziksel cihaz testi yapılmadan üretim hazır kabul edilmemelidir.
- Firebase Rules yazılmadan/son kontrolü yapılmadan production kullanımı güvenli kabul edilmemelidir.
- Dökümanlar modülünde `expo-print` gibi yeni native bağımlılıklar eklendiği için Codemagic'te temiz (clean/reset cache) build alınması gerekir.
