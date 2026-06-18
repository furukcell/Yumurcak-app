# Yumurcak Kreş — Güncel Yol Haritası

Bu doküman, **Yumurcak Kreş** uygulamasının mevcut durumunu ve bundan sonra yapılacak işleri gösterir.

Durum renkleri:

* 🟢 **Yapıldı / temel seviye tamamlandı**
* ⚪ **Yapılacak / sonraki aşama**

---

## 1. Genel Hedef

Yumurcak Kreş’in ilk hedefi yeni özellik eklemek değil, çalışan bir MVP oluşturmaktır.

Ana MVP cümlesi:

> Bir öğretmen çocuk için günlük rapor girsin, veli kendi telefonundan o raporu görebilsin, yönetici ise sınıf/çocuk/öğretmen/veli bağlantısını yönetebilsin.

---

## 2. MVP Ana Akış

| Durum | İş                                                                |
| ----- | ----------------------------------------------------------------- |
| 🟢    | Uygulama Expo + React Native + Firebase yapısına oturtuldu        |
| 🟢    | Rol bazlı yapı belirlendi: `yonetici`, `ogretmen`, `veli`         |
| 🟢    | Yönetici / öğretmen / veli navigation yapısı kuruldu              |
| 🟢    | Öğretmen çocuk için günlük rapor girecek ekran yapısına kavuştu   |
| 🟢    | Veli kendi çocuğunun raporlarını görecek ekran yapısına kavuştu   |
| 🟢    | Firebase Realtime Database ana veri modeli belirlendi             |
| 🟢    | README güncel MVP yapısına göre sadeleştirildi                    |
| ⚪     | Admin panelindeki tüm CRUD işlemleri gerçek cihazda test edilecek |
| ⚪     | Öğretmen rapor girme akışı uçtan uca test edilecek                |
| ⚪     | Veli rapor görüntüleme akışı uçtan uca test edilecek              |
| ⚪     | 3 test hesabıyla gerçek MVP senaryosu denenilecek                 |

---

## 3. Teknik Toparlama

| Durum | İş                                                                         |
| ----- | -------------------------------------------------------------------------- |
| 🟢    | `App.js` ana giriş yapısı toparlandı                                       |
| 🟢    | `AuthProvider`, `NavigationContainer`, `RootNavigator` yapısı kuruldu      |
| 🟢    | Eski TypeScript karmaşası azaltıldı                                        |
| 🟢    | `firebase.ts` yerine `firebase.js` kullanılacak yapı oluşturuldu           |
| 🟢    | `constants.js` yapısı `src/constants.js` standardına çekildi               |
| 🟢    | `app.json` sadeleştirildi                                                  |
| 🟢    | Eksik asset dosyaları build patlatmasın diye `app.json` içinden kaldırıldı |
| 🟢    | Android `versionCode` eklendi                                              |
| 🟢    | Expo SDK 53’e geçildi                                                      |
| 🟢    | EAS production profili AAB üretimine ayarlandı                             |
| 🟢    | Codemagic production build kullanacak şekilde düzenlendi                   |
| ⚪     | `npm install --legacy-peer-deps` testi yapılacak                           |
| ⚪     | `npx expo install --fix` çalıştırılacak                                    |
| ⚪     | `npx expo start --clear` ile Metro testi yapılacak                         |
| ⚪     | `npx expo-doctor` çıktısı kontrol edilecek                                 |
| ⚪     | Codemagic üzerinden ilk AAB build alınacak                                 |
| ⚪     | Build hatası çıkarsa import/runtime hataları temizlenecek                  |

---

## 4. Expo / Google Play Hazırlığı

| Durum | İş                                                          |
| ----- | ----------------------------------------------------------- |
| 🟢    | Expo SDK 53’e geçildi                                       |
| 🟢    | Google Play için AAB build hedeflendi                       |
| 🟢    | `eas.json` production profili düzenlendi                    |
| 🟢    | `codemagic.yaml` production build komutuna çekildi          |
| 🟢    | Android package adı belirlendi: `com.furukcell.yumurcakapp` |
| 🟢    | Android `versionCode: 1` eklendi                            |
| ⚪     | İlk AAB dosyası üretilecek                                  |
| ⚪     | Play Console kapalı test kanalı açılacak                    |
| ⚪     | Test kullanıcı listesi hazırlanacak                         |
| ⚪     | Kapalı teste ilk sürüm yüklenecek                           |
| ⚪     | Crash / açılış / giriş / rapor testleri yapılacak           |

---

## 5. Firebase Veri Modeli

Kullanılacak ana node yapısı:

```txt
kullanicilar/
kresler/
siniflar/
cocuklar/
gunlukRaporlar/
duyurular/
```

| Durum | İş                                                                                              |
| ----- | ----------------------------------------------------------------------------------------------- |
| 🟢    | Türkçe veri modeli seçildi                                                                      |
| 🟢    | Roller netleştirildi: `yonetici`, `ogretmen`, `veli`                                            |
| 🟢    | `kullanicilar` yapısı belirlendi                                                                |
| 🟢    | `kresler` yapısı belirlendi                                                                     |
| 🟢    | `siniflar` yapısı belirlendi                                                                    |
| 🟢    | `cocuklar` yapısı belirlendi                                                                    |
| 🟢    | `gunlukRaporlar` yapısı belirlendi                                                              |
| 🟢    | `duyurular` yapısı belirlendi                                                                   |
| ⚪     | Firebase içinde test verileri manuel oluşturulacak                                              |
| ⚪     | Eski `users`, `raporlar`, `parentIds`, `teacherIds` gibi İngilizce/karışık alanlar temizlenecek |
| ⚪     | Tüm sorgular `kresId` filtresiyle güvenli hale getirilecek                                      |
| ⚪     | Veli sadece kendi çocuğunu görebilecek şekilde kontrol edilecek                                 |
| ⚪     | Öğretmen sadece kendi sınıfındaki çocukları görebilecek şekilde kontrol edilecek                |

---

## 6. Auth / Giriş Sistemi

| Durum | İş                                                       |
| ----- | -------------------------------------------------------- |
| 🟢    | Geçici kullanıcı adı / şifre sistemi kuruldu             |
| 🟢    | Kullanıcı rolüne göre yönlendirme mantığı oluşturuldu    |
| 🟢    | Oturum bilgisini saklama mantığı eklendi                 |
| 🟢    | Çıkış yapma akışı oluşturuldu                            |
| ⚪     | Firebase Auth email/password sistemine geçilecek         |
| ⚪     | Düz metin şifre kullanımı kaldırılacak                   |
| ⚪     | Kullanıcı profili `kullanicilar/{uid}` altında tutulacak |
| ⚪     | Login hataları daha kullanıcı dostu hale getirilecek     |
| ⚪     | Pasif kullanıcı / aktif kullanıcı kontrolü eklenecek     |

---

## 7. Yönetici Paneli

Yönetici, kreş müdürü / kreş yönetimi anlamına gelir.

| Durum | İş                                                      |
| ----- | ------------------------------------------------------- |
| 🟢    | Yönetici rolü tanımlandı                                |
| 🟢    | Yönetici stack yapısı oluşturuldu                       |
| 🟢    | Yönetici paneli için temel ekranlar oluşturuldu         |
| 🟢    | Sınıf ekranları eklendi                                 |
| 🟢    | Çocuk ekranları eklendi                                 |
| 🟢    | Öğretmen ekranları eklendi                              |
| 🟢    | Veli ekranları eklendi                                  |
| 🟢    | Duyuru ekranları eklendi                                |
| ⚪     | Sınıf oluşturma gerçek Firebase verisiyle test edilecek |
| ⚪     | Öğretmen oluşturma ve sınıfa atama test edilecek        |
| ⚪     | Veli oluşturma test edilecek                            |
| ⚪     | Çocuk oluşturma test edilecek                           |
| ⚪     | Çocuğu veliye bağlama test edilecek                     |
| ⚪     | Çocuğu sınıfa bağlama test edilecek                     |
| ⚪     | Yönetici ekranlarında eksik CRUD işlemleri tamamlanacak |
| ⚪     | Gereksiz/boş placeholder ekranlar temizlenecek          |

---

## 8. Öğretmen Paneli

| Durum | İş                                                                  |
| ----- | ------------------------------------------------------------------- |
| 🟢    | Öğretmen rolü tanımlandı                                            |
| 🟢    | Öğretmen stack yapısı oluşturuldu                                   |
| 🟢    | Öğretmen dashboard ekranı oluşturuldu                               |
| 🟢    | Öğretmenin kendi sınıfındaki çocukları görmesi hedeflendi           |
| 🟢    | Çocuk raporu giriş ekranı oluşturuldu                               |
| 🟢    | Günlük rapor alanları eklendi                                       |
| ⚪     | Öğretmenin sadece kendi sınıfındaki çocukları gördüğü test edilecek |
| ⚪     | Aynı çocuk için aynı gün ikinci rapor davranışı netleştirilecek     |
| ⚪     | Rapor kaydetme sonrası başarılı / hata mesajları test edilecek      |
| ⚪     | Saving/loading state kontrol edilecek                               |
| ⚪     | Rapor kaydı sonrası veliye bildirim akışı bağlanacak                |

---

## 9. Veli Paneli

| Durum | İş                                                      |
| ----- | ------------------------------------------------------- |
| 🟢    | Veli rolü tanımlandı                                    |
| 🟢    | Veli stack yapısı oluşturuldu                           |
| 🟢    | Veli dashboard ekranı oluşturuldu                       |
| 🟢    | Veliye bağlı çocukları listeleme hedeflendi             |
| 🟢    | Veli rapor görüntüleme ekranı oluşturuldu               |
| ⚪     | Veli sadece kendi çocuğunu görüyor mu test edilecek     |
| ⚪     | Başka veliye ait çocuk görünmüyor mu test edilecek      |
| ⚪     | Raporlar tarihe göre doğru sıralanıyor mu test edilecek |
| ⚪     | Rapor yoksa boş ekran mesajı kontrol edilecek           |
| ⚪     | Duyuru görüntüleme akışı tamamlanacak                   |

---

## 10. Günlük Rapor Sistemi

| Durum | İş                                                                                |
| ----- | --------------------------------------------------------------------------------- |
| 🟢    | Günlük rapor sistemi MVP’nin ana özelliği olarak belirlendi                       |
| 🟢    | Rapor giriş ekranı oluşturuldu                                                    |
| 🟢    | Ruh hali alanı eklendi                                                            |
| 🟢    | Yemek bilgisi alanı eklendi                                                       |
| 🟢    | Uyku bilgisi alanı eklendi                                                        |
| 🟢    | Tuvalet bilgisi alanı eklendi                                                     |
| 🟢    | Öğretmen notu alanı eklendi                                                       |
| 🟢    | Raporların Firebase’e yazılması hedeflendi                                        |
| ⚪     | Raporların `gunlukRaporlar` node’una doğru yazıldığı test edilecek                |
| ⚪     | Raporlarda `kresId`, `sinifId`, `cocukId`, `ogretmenId` alanları kontrol edilecek |
| ⚪     | Aynı gün rapor güncelleme / yeniden oluşturma kararı verilecek                    |
| ⚪     | Veli rapor ekranında doğru veri görüntülendiği test edilecek                      |

---

## 11. Duyuru Sistemi

| Durum | İş                                                         |
| ----- | ---------------------------------------------------------- |
| 🟢    | Duyuru sistemi MVP içinde tanımlandı                       |
| 🟢    | Yönetici duyuru ekranları oluşturuldu                      |
| ⚪     | Duyuru oluşturma Firebase ile test edilecek                |
| ⚪     | Veli duyuruları görebilecek şekilde ekran tamamlanacak     |
| ⚪     | Öğretmen duyuruları görebilecek şekilde ekran tamamlanacak |
| ⚪     | Acil / normal duyuru ayrımı test edilecek                  |
| ⚪     | Duyuru bildirimi MVP sonrası aktif edilecek                |

---

## 12. Bildirim Sistemi

| Durum | İş                                                                |
| ----- | ----------------------------------------------------------------- |
| 🟢    | Expo Notifications altyapısı projede yer aldı                     |
| 🟢    | Bildirim sistemi MVP sonrası aktif edilecek şekilde planlandı     |
| 🟢    | Bildirim kodlarının uygulamayı çökertmemesi hedeflendi            |
| ⚪     | Expo Project ID netleştirilecek                                   |
| ⚪     | Push token alma gerçek cihazda test edilecek                      |
| ⚪     | Token `kullanicilar/{uid}/pushToken` altında tutulacak            |
| ⚪     | Rapor girildiğinde veliye bildirim gönderilecek                   |
| ⚪     | Duyuru yayınlandığında ilgili kullanıcılara bildirim gönderilecek |
| ⚪     | Üretim için mümkünse Cloud Functions değerlendirilecek            |

---

## 13. Firebase Security Rules

| Durum | İş                                                      |
| ----- | ------------------------------------------------------- |
| ⚪     | Firebase Security Rules üretim için güçlendirilecek     |
| ⚪     | Yönetici sadece kendi kreşinin verisini görecek         |
| ⚪     | Öğretmen sadece kendi sınıfındaki çocukları görecek     |
| ⚪     | Veli sadece kendi çocuğunu görecek                      |
| ⚪     | Veli rapor okuyacak ama yazamayacak                     |
| ⚪     | Öğretmen rapor yazabilecek                              |
| ⚪     | Farklı kreş verileri birbirinden ayrılacak              |
| ⚪     | Kapalı test öncesi minimum güvenlik kuralları yazılacak |

---

## 14. Test Hesapları

| Durum | İş                                                 |
| ----- | -------------------------------------------------- |
| 🟢    | Test kullanıcı rolleri belirlendi                  |
| 🟢    | Yönetici test hesabı belirlendi                    |
| 🟢    | Öğretmen test hesabı belirlendi                    |
| 🟢    | Veli test hesabı belirlendi                        |
| ⚪     | Firebase içine gerçek test kullanıcıları eklenecek |
| ⚪     | Test sınıfı oluşturulacak                          |
| ⚪     | Test çocuk kaydı oluşturulacak                     |
| ⚪     | Öğretmen sınıfa bağlanacak                         |
| ⚪     | Çocuk veliye bağlanacak                            |
| ⚪     | Uçtan uca test yapılacak                           |

---

## 15. Uçtan Uca MVP Testi

Bu akış hatasız çalışmadan yeni büyük özellik eklenmeyecek.

| Durum | Test                                                       |
| ----- | ---------------------------------------------------------- |
| ⚪     | Uygulama açılıyor mu?                                      |
| ⚪     | Login ekranı geliyor mu?                                   |
| ⚪     | Yönetici giriş yapabiliyor mu?                             |
| ⚪     | Yönetici sınıf oluşturabiliyor mu?                         |
| ⚪     | Yönetici öğretmen oluşturabiliyor mu?                      |
| ⚪     | Yönetici veli oluşturabiliyor mu?                          |
| ⚪     | Yönetici çocuk oluşturabiliyor mu?                         |
| ⚪     | Çocuk sınıfa bağlanıyor mu?                                |
| ⚪     | Çocuk veliye bağlanıyor mu?                                |
| ⚪     | Öğretmen kendi sınıfındaki çocuğu görüyor mu?              |
| ⚪     | Öğretmen günlük rapor giriyor mu?                          |
| ⚪     | Veli kendi çocuğunu görüyor mu?                            |
| ⚪     | Veli günlük raporu görüyor mu?                             |
| ⚪     | Çıkış yap / tekrar giriş akışı çalışıyor mu?               |
| ⚪     | Uygulama kapanıp açıldığında oturum kontrolü çalışıyor mu? |

---

## 16. Tasarım Yaklaşımı

| Durum | İş                                                       |
| ----- | -------------------------------------------------------- |
| 🟢    | Uygulamanın aile/çocuk/güven odaklı olması belirlendi    |
| 🟢    | Sade ve sıcak tasarım hedefi belirlendi                  |
| ⚪     | Renk paleti netleştirilecek                              |
| ⚪     | Ortak buton/kart/input componentleri sadeleştirilecek    |
| ⚪     | Veli ekranları daha güven veren hale getirilecek         |
| ⚪     | Öğretmen ekranları hızlı veri girişine göre düzenlenecek |
| ⚪     | Yönetici ekranlarında karmaşa azaltılacak                |

---

## 17. İş Modeli

| Durum | İş                                                       |
| ----- | -------------------------------------------------------- |
| 🟢    | B2B abonelik modeli seçildi                              |
| 🟢    | “Kreş öder, veli ücretsiz kullanır” yaklaşımı belirlendi |
| 🟢    | İlk pilotta ödeme entegrasyonu şart değil kararı verildi |
| ⚪     | Pilot sonrası fiyat netleştirilecek                      |
| ⚪     | İlk 5-10 kreş için özel lansman fiyatı düşünülecek       |
| ⚪     | Ödeme entegrasyonu MVP sonrası değerlendirilecek         |

---

## 18. Pilot Kreş Planı

| Durum | İş                                                             |
| ----- | -------------------------------------------------------------- |
| 🟢    | Önce tek pilot kreşte denenmesi gerektiği belirlendi           |
| 🟢    | Pilot hedefi belirlendi: 1 kreş, 2 öğretmen, 10 veli, 15 çocuk |
| ⚪     | Pilot kreş adayı bulunacak                                     |
| ⚪     | Demo test hesapları hazırlanacak                               |
| ⚪     | 2 haftalık pilot kullanım yapılacak                            |
| ⚪     | Öğretmenlerden geri bildirim alınacak                          |
| ⚪     | Velilerden geri bildirim alınacak                              |
| ⚪     | Yönetici kullanım zorluğu ölçülecek                            |
| ⚪     | Pilot sonrası fiyatlandırma ve özellik listesi revize edilecek |

---

## 19. Sürüm Planı

### v0.1 — Teknik Toparlama

| Durum | İş                                        |
| ----- | ----------------------------------------- |
| 🟢    | App.js düzenlendi                         |
| 🟢    | Navigation bağlandı                       |
| 🟢    | app.json düzeltildi                       |
| 🟢    | Expo SDK 53’e geçildi                     |
| 🟢    | EAS / Codemagic production AAB ayarlandı  |
| ⚪     | Eski ekran karmaşası tamamen temizlenecek |
| ⚪     | İlk Metro testi yapılacak                 |

---

### v0.2 — Auth ve Rol Sistemi

| Durum | İş                                                               |
| ----- | ---------------------------------------------------------------- |
| 🟢    | Geçici kullanıcı adı / şifre sistemi çalışacak şekilde planlandı |
| 🟢    | Rol bazlı yönlendirme oluşturuldu                                |
| ⚪     | Firebase Auth’a geçilecek                                        |
| ⚪     | Kullanıcı profili database ile güvenli bağlanacak                |
| ⚪     | Şifreler düz metin olmaktan çıkarılacak                          |

---

### v0.3 — Yönetici MVP

| Durum | İş                                                |
| ----- | ------------------------------------------------- |
| 🟢    | Yönetici ekran iskeleti oluşturuldu               |
| 🟢    | Sınıf ekranları oluşturuldu                       |
| 🟢    | Öğretmen ekranları oluşturuldu                    |
| 🟢    | Veli ekranları oluşturuldu                        |
| 🟢    | Çocuk ekranları oluşturuldu                       |
| ⚪     | Tüm yönetici CRUD akışı test edilecek             |
| ⚪     | Çocuk-sınıf-veli-öğretmen bağlantısı doğrulanacak |

---

### v0.4 — Öğretmen MVP

| Durum | İş                                                             |
| ----- | -------------------------------------------------------------- |
| 🟢    | Öğretmen ekran iskeleti oluşturuldu                            |
| 🟢    | Çocuk listesi ekranı oluşturuldu                               |
| 🟢    | Günlük rapor ekranı oluşturuldu                                |
| ⚪     | Öğretmen kendi sınıfındaki çocuğu görebiliyor mu test edilecek |
| ⚪     | Günlük rapor Firebase’e doğru yazılıyor mu test edilecek       |

---

### v0.5 — Veli MVP

| Durum | İş                                                      |
| ----- | ------------------------------------------------------- |
| 🟢    | Veli ekran iskeleti oluşturuldu                         |
| 🟢    | Çocuk listeleme hedefi oluşturuldu                      |
| 🟢    | Rapor görüntüleme ekranı oluşturuldu                    |
| ⚪     | Veli kendi çocuğunu görebiliyor mu test edilecek        |
| ⚪     | Veli rapor geçmişini doğru görebiliyor mu test edilecek |

---

### v0.6 — Duyuru ve Bildirim

| Durum | İş                                                 |
| ----- | -------------------------------------------------- |
| 🟢    | Duyuru ekranları oluşturuldu                       |
| 🟢    | Bildirim altyapısı planlandı                       |
| ⚪     | Duyuru Firebase akışı test edilecek                |
| ⚪     | Push bildirim gerçek cihazda test edilecek         |
| ⚪     | Bildirimlerin uygulamayı çökertmediği doğrulanacak |

---

### v0.7 — Güvenlik ve Pilot Hazırlık

| Durum | İş                             |
| ----- | ------------------------------ |
| ⚪     | Firebase rules güçlendirilecek |
| ⚪     | Test hesapları oluşturulacak   |
| ⚪     | Uçtan uca test yapılacak       |
| ⚪     | Kapalı test AAB build alınacak |
| ⚪     | Pilot kreş demo hazırlanacak   |

---

### v1.0 — Pilot Sürüm

| Durum | İş                                                         |
| ----- | ---------------------------------------------------------- |
| ⚪     | 1 pilot kreş ile gerçek kullanım testi yapılacak           |
| ⚪     | Öğretmen geri bildirimleri toplanacak                      |
| ⚪     | Veli geri bildirimleri toplanacak                          |
| ⚪     | Hatalar düzeltilecek                                       |
| ⚪     | Sonraki özellik listesi gerçek kullanıma göre belirlenecek |

---

## 20. MVP Sonrası Özellikler

Aşağıdaki özellikler şimdilik yapılmayacak.

| Durum | Özellik                    |
| ----- | -------------------------- |
| ⚪     | Veli-öğretmen mesajlaşması |
| ⚪     | Fotoğraf yükleme           |
| ⚪     | Video yükleme              |
| ⚪     | Canlı kamera               |
| ⚪     | Servis takibi              |
| ⚪     | Detaylı yemek menüsü       |
| ⚪     | PDF rapor çıktısı          |
| ⚪     | Aylık gelişim analizi      |
| ⚪     | AI yorum / AI özet         |
| ⚪     | Çoklu şube sistemi         |
| ⚪     | Ödeme entegrasyonu         |
| ⚪     | Gelişmiş istatistik paneli |
| ⚪     | Web yönetim paneli         |

---

## 21. Nihai Hedef

Yumurcak’ın nihai hedefi:

> Kreşlerin velilere daha profesyonel, düzenli ve güvenilir şekilde günlük çocuk bilgisi sunmasını sağlayan sade bir mobil uygulama olmak.

İlk hedef büyük ve karmaşık sistem kurmak değildir.

İlk hedef:

```txt
Bir öğretmen kolayca rapor girebilsin.
Bir veli çocuğunun raporunu güvenle görebilsin.
Bir yönetici sınıf, çocuk, öğretmen ve veli bağlantısını yönetebilsin.
```

Bu üç temel şey sağlam çalışıyorsa Yumurcak ürünleşmeye başlamış demektir.
