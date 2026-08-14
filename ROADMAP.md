# 🚀 YUMURCAK — ROADMAP

> Yumurcak; kreş, öğretmen, yönetici ve veliler arasındaki iletişimi, günlük takibi ve okul operasyonlarını tek bir mobil platformda birleştiren üretim ortamındaki uygulamadır.
>
> **Mevcut durum:** 🟢 ÜRETİMDE
>
> Bu roadmap, tamamlanan özellikleri ve bundan sonraki geliştirme yönünü gösterir.

---

# 📍 1. PROJE DURUMU

## 🟢 Üretim Durumu

- [x] Uygulama üretim ortamına hazırlandı
- [x] Android production build
- [x] Gerçek cihaz testleri
- [x] Temel kullanıcı akışlarının test edilmesi
- [x] Yönetici paneli
- [x] Öğretmen paneli
- [x] Veli paneli
- [x] Firebase altyapısı
- [x] Push notification sistemi
- [x] OTA güncelleme sistemi
- [x] Uygulama içi güncelleme kontrolü
- [x] Deep link / bildirim yönlendirme sistemi
- [x] Hata yakalama sistemi
- [x] Async / authentication altyapısı
- [x] Uygulamanın production kullanımına alınması

---

# 🔐 2. KULLANICI VE YETKİLENDİRME SİSTEMİ

- [x] Yönetici hesabı
- [x] Öğretmen hesabı
- [x] Veli hesabı
- [x] Rol bazlı ekran yönlendirme
- [x] Kullanıcı oturum sistemi
- [x] Oturumun korunması
- [x] Güvenli kullanıcı verisi yönetimi
- [x] Kullanıcı bazlı yetkilendirme
- [x] Firebase Authentication altyapısı
- [x] Kullanıcı profil sistemi

---

# 👨‍👩‍👧 3. VELİ PANELİ

## Günlük Takip

- [x] Çocuğun günlük durumunu görüntüleme
- [x] Günlük akış
- [x] Öğün / yemek bilgileri
- [x] Uyku bilgileri
- [x] Tuvalet / kişisel takip bilgileri
- [x] Günlük aktiviteler
- [x] Öğretmen tarafından girilen günlük bilgiler

## Çocuk Bilgileri

- [x] Çocuk profil bilgileri
- [x] Çocuğun gelişim bilgilerinin görüntülenmesi
- [x] Çocuğa ait okul bilgileri
- [x] Sınıf bilgileri

## İletişim

- [x] Öğretmen / okul iletişimi
- [x] Bildirimler
- [x] Duyurular
- [x] Mesajlaşma altyapısı
- [x] Bildirim üzerinden ilgili ekrana yönlendirme

## Galeri

- [x] Fotoğraf galerisi
- [x] Okul tarafından paylaşılan görseller
- [x] Galeri medya optimizasyonu

---

# 🌍 4. ÇOKLU DİL DESTEĞİ

## Veli

- [x] Türkçe
- [x] İngilizce

> İngilizce dil desteği şu anda **veli tarafında tamamlanmıştır.**

## Gelecek

- [ ] Öğretmen ekranlarının İngilizceleştirilmesi
- [ ] Yönetici ekranlarının İngilizceleştirilmesi
- [ ] Almanca
- [ ] İtalyanca
- [ ] Fransızca
- [ ] Rusça
- [ ] Arapça

### Dil Geliştirme Sırası

1. 🇹🇷 Türkçe — Tamamlandı
2. 🇬🇧 İngilizce — Veli tarafı tamamlandı
3. 🇩🇪 Almanca   - Veli tarafı tamamlandı
4. 🇮🇹 İtalyanca  
5. 🇫🇷 Fransızca  -Veli tarafı tamamlandı
6. 🇷🇺 Rusça      -Veli tarafı tamamlandı
7. 🇸🇦 Arapça

---

# 🔔 5. BİLDİRİM SİSTEMİ

- [x] Firebase / Expo push notification altyapısı
- [x] Push token oluşturma
- [x] Push token'ın veritabanına kaydedilmesi
- [x] Kullanıcı bazlı bildirim
- [x] Bildirime tıklama
- [x] Bildirimden ilgili ekrana yönlendirme
- [x] Deep link sistemi
- [x] Uygulama kapalıyken bildirim yönlendirmesi
- [x] Uygulama arka plandayken bildirim yönlendirmesi
- [x] Uygulama açıkken bildirim yönetimi

---

# 🔄 6. OTA GÜNCELLEME SİSTEMİ

- [x] Expo Updates entegrasyonu
- [x] Uygulama açılışında güncelleme kontrolü
- [x] Yeni OTA update kontrolü
- [x] Güncellemenin indirilmesi
- [x] Güncelleme sonrası uygulamanın yeniden başlatılması
- [x] Production ortamında OTA akışı
- [x] GitHub Actions üzerinden build / deployment süreci

> OTA sistemi sayesinde uygun değişikliklerde yeni APK/AAB yayınlamadan uygulama kodu güncellenebilmektedir.

---

# 💳 7. REVENUECAT / ABONELİK SİSTEMİ

- [x] RevenueCat entegrasyonu
- [x] Abonelik altyapısı
- [x] Google Play abonelik entegrasyonu
- [x] Ürün tanımları
- [x] Abonelik durumunun kontrol edilmesi
- [x] Aktif aboneliğin uygulamaya yansıtılması
- [x] Abonelik sona erdiğinde durumun güncellenmesi
- [x] Restore Purchases
- [x] Gerçek cihaz üzerinde test
- [x] Test hesaplarıyla satın alma akışı
- [x] Restore işleminin test edilmesi

### Production Durumu

🟢 RevenueCat sistemi production'da aktiftir.

> Gerçek para ile production satın alma testi henüz yapılmamıştır. Mevcut testler Google Play test hesaplarıyla gerçekleştirilmiştir.

---

# 🏫 8. YÖNETİCİ PANELİ

- [x] Yönetici giriş sistemi
- [x] Yönetici ana ekranı
- [x] Öğretmen yönetimi
- [x] Sınıf / öğrenci yönetimi
- [x] Veli yönetimi
- [x] Duyuru yönetimi
- [x] Günlük takip yönetimi
- [x] Sistem yönetimi
- [x] Yönetici istatistikleri

### Gelecek

- [ ] Yönetici panelinin İngilizce desteği
- [ ] Gelişmiş kurum istatistikleri
- [ ] Gelişmiş raporlama
- [ ] Kurum bazlı analizler

---

# 👩‍🏫 9. ÖĞRETMEN PANELİ

- [x] Öğretmen giriş sistemi
- [x] Öğretmen ana ekranı
- [x] Öğrenci listesi
- [x] Günlük takip
- [x] Yemek bilgisi
- [x] Uyku takibi
- [x] Aktivite takibi
- [x] Veli iletişimi
- [x] Bildirim sistemi
- [x] Fotoğraf / galeri işlemleri

### Gelecek

- [ ] Öğretmen panelinin İngilizce desteği
- [ ] Gelişmiş öğretmen raporları
- [ ] Öğretmen performans / sınıf analizleri

---

# 🍽️ 10. YEMEK VE GÜNLÜK PROGRAM

- [x] Yemek listesi
- [x] Günlük yemek bilgileri
- [x] Çocuğun yemek durumunun takibi
- [x] Günlük program
- [x] Kuruma özel içerik yönetimi
- [x] Veli tarafında görüntüleme

### Gelecek

- [ ] Yemek listesi PDF çıktısı geliştirmeleri
- [ ] Kuruma özel şablonlar
- [ ] Gelişmiş program yönetimi

---

# 📸 11. GALERİ VE MEDYA

- [x] Fotoğraf paylaşımı
- [x] Veli galeri görüntüleme
- [x] Medya optimizasyonu
- [x] Görsellerin performanslı yüklenmesi
- [x] Yetkili kullanıcı erişimi

### Gelecek

- [ ] Daha gelişmiş medya optimizasyonu
- [ ] Video desteğinin geliştirilmesi
- [ ] Kurum bazlı medya arşivi

---

# 🧠 12. GELİŞİM TAKİBİ

- [x] Çocuk gelişim bilgilerinin tutulması
- [x] Gelişim verilerinin veli tarafından görüntülenmesi
- [x] Öğretmen tarafından gelişim bilgisi girişi

### Gelecek

- [ ] Gelişim raporları
- [ ] Grafiksel gelişim takibi
- [ ] Dönemsel karşılaştırmalar
- [ ] Veliye özel gelişim özeti
- [ ] Gelişim verilerinin PDF raporu

---

# 💰 13. ÖDEME VE TİCARİ ALTYAPI

- [x] RevenueCat
- [x] Google Play abonelik sistemi
- [x] Abonelik kontrolü
- [x] Abonelik durumunun Firebase ile senkronizasyonu
- [x] Test satın alma sistemi

### Gelecek

- [ ] Kurum bazlı paketler
- [ ] Farklı abonelik planları
- [ ] Kurum yöneticisi için ödeme yönetimi
- [ ] Gelişmiş gelir / abonelik istatistikleri

---

# 🛠️ 14. TEKNİK ALTYAPI

- [x] Expo
- [x] React Native
- [x] Firebase
- [x] Firebase Authentication
- [x] Firebase Database
- [x] Expo Notifications
- [x] Expo Updates
- [x] React Navigation
- [x] AsyncStorage
- [x] RevenueCat
- [x] GitHub
- [x] GitHub Actions
- [x] Production build pipeline
- [x] OTA deployment

---

# 📱 15. UYGULAMA PERFORMANSI

- [x] Gerçek cihaz testleri
- [x] Splash screen
- [x] Error Boundary
- [x] Push token senkronizasyonu
- [x] Uygulama arka plandan döndüğünde token kontrolü
- [x] Android navigation bar yönetimi
- [x] Bildirim deep link sistemi
- [x] Medya optimizasyonu
- [x] OTA update kontrolü

### Gelecek

- [ ] Daha kapsamlı crash monitoring
- [ ] Performans metrikleri
- [ ] Ağ bağlantısı optimizasyonları
- [ ] Düşük internet hızında kullanım iyileştirmeleri

---

# 🔒 16. GÜVENLİK

- [x] Firebase Authentication
- [x] Rol bazlı erişim
- [x] Kullanıcı bazlı veri erişimi
- [x] Push token kullanıcı eşleştirme
- [x] Yetkisiz ekran erişiminin engellenmesi
- [x] Hata yakalama

### Gelecek

- [ ] Daha kapsamlı Firebase Security Rules denetimi
- [ ] Güvenlik audit'i
- [ ] Hassas veri erişimlerinin detaylı loglanması

---

# 📊 17. RAPORLAMA VE ANALİZ

- [x] Temel yönetici istatistikleri
- [x] Sistem istatistikleri
- [x] Kullanıcı bazlı veriler

### Gelecek

- [ ] Kurum istatistikleri
- [ ] Öğrenci devam analizleri
- [ ] Günlük / haftalık / aylık raporlar
- [ ] Gelişim raporları
- [ ] Yemek / uyku analizleri
- [ ] PDF raporları
- [ ] Yönetici dashboard'u
- [ ] Grafiksel analizler

---

# 🚀 18. GELECEK GELİŞTİRMELER

## Öncelikli

- [ ] Öğretmen İngilizce desteği
- [ ] Yönetici İngilizce desteği
- [ ] Almanca dil desteği
- [ ] İtalyanca dil desteği
- [ ] Fransızca dil desteği
- [ ] Rusça dil desteği
- [ ] Arapça dil desteği

## Ürün Geliştirmeleri

- [ ] Gelişmiş raporlama
- [ ] Gelişim grafikleri
- [ ] PDF rapor sistemi
- [ ] Kurum dashboard'u
- [ ] Gelişmiş bildirim otomasyonu
- [ ] Gelişmiş medya / video sistemi
- [ ] Kurum bazlı analitik

---

# 🌍 19. ULUSLARARASILAŞMA

Yumurcak'ın farklı ülkelerde kullanılabilmesi için dil altyapısı kademeli olarak genişletilecektir.

### Planlanan sıra:

**1. Türkçe**  
🟢 Tamamlandı

**2. İngilizce**  
🟢 Veli tarafı tamamlandı  
🟡 Öğretmen + yönetici tarafı planlandı

**3. Almanca**  
🟢 Veli tarafı tamamlandı  
🟡 Öğretmen + yönetici tarafı planlandı

**4. İtalyanca**  
⚪ Planlandı

**5. Fransızca**  
🟢 Veli tarafı tamamlandı  
🟡 Öğretmen + yönetici tarafı planlandı

**6. Rusça**  
🟢 Veli tarafı tamamlandı  
🟡 Öğretmen + yönetici tarafı planlandı

**7. Arapça**  
⚪ Son aşama

---

# 🧪 20. TEST DURUMU

## Gerçek Cihaz

- [x] Android gerçek cihaz testi
- [x] Veli akışları
- [x] Öğretmen akışları
- [x] Yönetici akışları
- [x] Bildirimler
- [x] OTA
- [x] RevenueCat test satın alma
- [x] Restore Purchases

## Eksik Production Testleri

- [ ] Test hesabı olmayan tamamen bağımsız cihazda abonelik testi
- [ ] Gerçek para ile production satın alma

> Bu iki madde yapılmadığı için RevenueCat sistemi "tamamen gerçek kullanıcı satın almasıyla doğrulandı" olarak işaretlenmemiştir. Ancak mevcut production entegrasyonu ve test satın alma / restore akışları çalışmaktadır.

---

# 🟢 21. MEVCUT SON DURUM

| Sistem | Durum |
|---|---|
| Production | 🟢 Aktif |
| Veli Paneli | 🟢 Aktif |
| Öğretmen Paneli | 🟢 Aktif |
| Yönetici Paneli | 🟢 Aktif |
| Firebase | 🟢 Aktif |
| Push Notifications | 🟢 Aktif |
| OTA Updates | 🟢 Aktif |
| RevenueCat | 🟢 Production |
| Türkçe | 🟢 Tamamlandı |
| İngilizce — Veli | 🟢 Tamamlandı |
| İngilizce — Öğretmen | ⚪ Planlandı |
| İngilizce — Yönetici | ⚪ Planlandı |
| Almanca |  Veli | 🟢 Tamamlandı |⚪ Planlandı |
| İtalyanca |  Veli | 🟢 Tamamlandı | ⚪ Planlandı |
| Fransızca | ⚪ Planlandı |
| Rusça |  Veli | 🟢 Tamamlandı ⚪ Planlandı |
| Arapça | ⚪ Planlandı |

---

# 🎯 22. YAKIN DÖNEM HEDEFİ

Yumurcak şu anda yeni bir "kapalı test" veya "beta" aşamasında değildir.

**Mevcut hedef:**

1. Üretimdeki uygulamanın stabilitesini korumak
2. Gerçek kurum ve kullanıcı kullanımından geri bildirim toplamak
3. Mevcut sistemlerde oluşabilecek hataları düzeltmek
4. Veli tarafındaki İngilizce desteğini tamamlamak
5. Öğretmen ve yönetici İngilizce desteğini geliştirmek
6. Yeni dilleri sırayla sisteme eklemek
7. RevenueCat gerçek production satın alma senaryosunu doğrulamak
8. Raporlama ve analitik özelliklerini geliştirmek
9. Yumurcak'ı farklı ülkelerde kullanılabilecek çok dilli bir kreş platformuna dönüştürmek

---

# 🏁 VİZYON

Yumurcak'ın hedefi yalnızca bir kreş takip uygulaması olmak değil;

**kreş → yönetici → öğretmen → veli → çocuk**

arasındaki tüm günlük operasyonu tek platformda yöneten, çok dilli ve ölçeklenebilir bir **dijital kreş yönetim platformu** haline gelmektir.

Uzun vadede Yumurcak;

- 🇹🇷 Türkiye
- 🇬🇧 İngiltere
- 🇩🇪 Almanya
- 🇮🇹 İtalya
- 🇫🇷 Fransa
- 🇷🇺 Rusya
- 🇸🇦 Arapça konuşulan pazarlar

başta olmak üzere farklı pazarlarda kullanılabilecek şekilde geliştirilecektir.
