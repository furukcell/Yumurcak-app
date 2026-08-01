# Yumurcak — Dökümanlar Modülü Yol Haritası (Yemek Listesi + Ders Programı)

> Bu dosya, bu iş üzerinde çalışan başka bir Claude oturumunun (veya geliştiricinin)
> sıfırdan bağlam kurmadan devam edebilmesi için yazıldı. Repo: `furukcell/Yumurcak-app`
> (React Native / Expo, Firebase **Realtime Database** — Firestore KULLANILMIYOR).

## Arka Plan / Neden Bu İş Yapılıyor

Kreş şu an (canlı kullanıcı yok, test aşamasındayız) iki ayrı şekilde veri giriyordu:
1. Aylık ders programı / yemek listesini **A4 kağıt fotoğrafı** olarak yüklüyordu (`dokumanlar` node'u, `TeacherDocumentsScreen.js`).
2. Ayrıca yemek listesini ve ders programını **gün gün elle** metin olarak da giriyordu.

Hedef: **Tek veri girişi → çoklu çıktı.** Öğretmen/yönetici bir ayı bir kere doldursun;
sistem bunu hem "PDF gibi görünüp indirilebilen/yayınlanabilen bir şablon" hem de
"bugünün özeti" gibi otomatik beslenen kartlara dönüştürsün. PDF/şablon **statik
dosya değil**, yapılandırılmış veriden her seferinde render edilen bir görünüm olacak.

Ayrıca: uzun gün-gün liste ekranları (özellikle `AdminMonthlyMealScreen`'in 28-31
günlük TextInput'ları art arda scroll edilmesi) yerine **Liste / Takvim toggle'ı**
eklenmesi istendi — bir güne tıklayıp o günü düzenlemek, listede kaydırmaktan
daha hızlı.

**Önemli mimari not:** ChatGPT'nin ilk verdiği doküman Firestore öneriyordu, bu
YANLIŞ — proje tamamen RTDB üzerinde. Firestore'a GEÇİLMEYECEK.

---

## Faz 0 — Veri Modelini Birleştirme ✅ TAMAMLANDI

**Ne yapıldı:** `dersProgramlari` node'u eskiden tek doküman + haftalık serbest
metin şeklindeydi: `dersProgramlari/{sinifId} = { kresId, sinifId, gunler: { pazartesi: "...", sali: "...", ... }, updatedAt }` — tarih/ay kavramı yoktu.

Bu, zaten gün-bazlı olan `yemekListeleri` modeliyle **aynı yapıya** taşındı:
artık `dersProgramlari` da `yemekListeleri` gibi, her gün ayrı bir kayıt (push key),
şu alanlarla:
```
dersProgramlari/{randomId} = {
  kresId, sinifId, tip: 'aylik', kaynak: 'admin_aylik',
  ayKey: '2026-08', tarih: '2026-08-05',
  baslik, etkinlik, aciklama,
  aktif: true, createdAt, updatedAt
}
```
Migration script YAZILMADI (kullanıcı istemedi — kreş canlı kullanmıyor, sıfırdan
başlandı).

**Değişen/yeni dosyalar:** `src/services/monthlyDocuments.js` (yeni, ortak servis),
`src/screens/admin/AdminMonthlyScheduleScreen.js` (yeni, bu modeli kullanan ekran).

---

## Faz 1 — Ortak "Aylık Belge Editörü" + Liste/Takvim ✅ TAMAMLANDI

**Ne yapıldı:**
- `src/services/monthlyDocuments.js`: `getDaysOfMonth`, `getMonthKey`, `getMonthLabel`,
  `shiftMonth`, `createInitialValues`, `countPublished`, `forClass` (sınıf bazlı
  belgeler için ek filtre — kresId+ayKey+kaynak yetmiyor, sinifId de gerekiyor).
- `src/components/MonthlyCalendarView.js`: Liste/Takvim toggle component'i.
  Takvimde dolu günler nokta ile işaretli, bugüne hafif vurgu var. Güne dokununca
  `onSelectDay(dateKey)` çağrılıyor — asıl form (kahvaltı/öğle/ara öğün veya
  etkinlik/açıklama) parent ekranda bir `Modal` içinde açılıyor, component'in
  kendisi içeriği bilmiyor (reusable).
- `AdminMonthlyMealScreen.js` (var olan ekran) bu ortak servise + component'e
  taşındı; davranış aynı kaldı, üstüne Takvim görünümü eklendi.
- `AdminMonthlyScheduleScreen.js` (yeni ekran) aynı component'leri ders programı
  için kullanıyor.
- `LessonScheduleListScreen.js` → artık `AdminMonthlySchedule` route'una yönlendiriyor;
  "bu sınıfın programı var mı" göstergesi düzeltildi (eski kontrol tek-doküman
  varsayıyordu, yeni modelle hep "yok" derdi — artık "bu ay yayında mı" diye bakıyor).
- `src/navigation/AdminStack.js`: `AdminMonthlySchedule` route'u eklendi.
  `LessonScheduleForm` route'u SİLİNMEDİ ama artık hiçbir yerden çağrılmıyor
  (bkz. Faz 6).

---

## Faz 2 — Taslak / Yayınla Akışı ✅ BÜYÜK ÖLÇÜDE TAMAMLANDI (Faz 1 içinde geldi)

Yemek listesinde zaten var olan "yerelde doldur → Ayı Paylaş" mantığı (taslak =
component'in local state'i, "Yayınla" = tek `update()` çağrısıyla DB'ye yazma +
aynı ay/kaynak için eski yayını `aktif:false` yapma) hem meal hem schedule
ekranında STANDART hale getirildi: `monthlyDocuments.js` → `publishMonth()` /
`unpublishMonth()`.

**Eksik kalan küçük iş:** Şu an "taslak" tamamen local state (ekran kapatılırsa
kaybolur, DB'ye ara kayıt yok). İstenirse ileride "taslağı da DB'ye otomatik
kaydet (autosave, aktif:false / durum:'taslak' olarak)" eklenebilir — şu an
gerekli değil, opsiyonel iyileştirme.

---

## Faz 3 — Şablon / PDF Render Servisi ✅ TAMAMLANDI

**Ne yapıldı:**
1. `package.json`'a `expo-print` (~14.1.4) ve `expo-sharing` (~13.1.5) eklendi
   (SDK 54 ile uyumlu son stabil sürümler). Codemagic'te "clean/reset cache"
   ile yeniden build alınması gerekiyor.
2. `src/services/documentPdf.js` (yeni): `buildMonthlyDocumentHtml()` — kayıt
   listesinden (yemek veya ders) A4 HTML üretiyor: kurum adı/adres/telefon/
   yönetici imzası, gün/öğün ya da gün/etkinlik tablosu, `logoUrl` varsa
   header'da gösteriyor (henüz kurum ayarlarında logo yükleme alanı yok, ileride
   eklenirse otomatik devreye girer). `printMonthlyDocument()` (native yazdırma
   diyaloğu) ve `shareMonthlyDocumentPdf()` (dosya üretip paylaşım sayfası açar
   — İndir ihtiyacı da bu paylaşım sayfası üzerinden karşılanıyor, ör. "Dosyalar"a
   kaydet) fonksiyonları var.
3. Kurum bilgisi `kresler/{kresId}`'den (`AdminInstitutionSettingsScreen.js`'in
   yazdığı node) `fetchInstitutionInfo()` ile otomatik çekiliyor.
4. **WebView tabanlı ayrı bir önizleme ekranı YAPILMADI** — bunun yerine
   `expo-print`'in native `printAsync` diyaloğu (kendi içinde önizleme +
   "PDF olarak kaydet" seçeneği barındırıyor) önizleme olarak kullanıldı. Sebep:
   `react-native-webview` gibi yeni bir native bağımlılık eklemekten kaçınmak
   (kullanıcının local dev ortamı yok, tüm build'ler Codemagic üzerinden — yeni
   native paket riski minimize edildi). İstenirse ileride ayrı bir WebView
   önizleme ekranı eklenebilir.
5. `src/components/MonthlyDocumentPdfBar.js` (yeni): "🖨️ Yazdır" + "📤 Paylaş/İndir"
   buton çifti. Kendi içinde DB'den güncel yayınlanmış (aktif) kayıtları çekiyor
   — ekranın local taslak state'ine değil, DB'nin gerçek haline bakıyor. Bu bar
   AYNI şekilde `AdminMonthlyMealScreen.js`, `AdminMonthlyScheduleScreen.js`,
   `TeacherScheduleScreen.js`'e bağlandı (tek renderer, tek buton mantığı — 2.
   maddede istenen "iki farklı PDF üretim kodu olmasın" şartı sağlandı). Veli
   tarafına (yayınlanan belgeyi görüp indirme) HENÜZ bağlanmadı — bkz. aşağıdaki not.

**Yapılmayan/ertelenen:** ~~Veli tarafında aynı `MonthlyDocumentPdfBar` henüz eklenmedi~~
✅ Sonradan eklendi — `ParentMealsScreen.js`'in "Aylık" sekmesine (yemek listesi
PDF'i) ve `ParentSummaryScreen.js`'in "Bugünkü program" kartına (o ay için
yayınlanmış ders programı varsa, `hasMonthlySchedule` kontrolüyle koşullu olarak
gösteriliyor) bağlandı. Artık gerçekten "iki farklı PDF üretim kodu yok" şartı
uçtan uca (admin + öğretmen + veli) sağlanmış durumda.

**⚠️ Bu faz sırasında bulunan ve düzeltilen kritik hata:** `monthlyDocuments.js`
içindeki `fetchNodeSnapshotOnce()` fonksiyonu (Faz 0-2'de yazılmıştı) node'u
**filtresiz** (`ref(database, nodePath)` + düz `onValue`) okuyordu. Ama Firebase
kuralları bu node'larda (`yemekListeleri`, `dersProgramlari`) filtresiz okumaya
izin vermiyor — sadece `orderByChild('kresId').equalTo(...)` sorgusuna izin
veriyor. Sonuç: okuma sessizce boş `{}` dönüyordu ve bu, üç fonksiyonu da
kırıyordu:
- `unpublishMonth()` → "Yayından Kaldır" hiçbir şey yapmıyordu (silinecek kayıt
  bulunamıyordu, ama kullanıcıya hata da gösterilmiyordu).
- `copyFromPreviousMonth()` → "Geçen Ayı Kopyala" her zaman "Bulunamadı" diyordu.
- `publishMonth()` → yeni kayıt ekleniyordu ama eski ay/kaynak kaydı `aktif:false`
  yapılamıyordu — veli tarafında eski + yeni kayıt birlikte görünme riski vardı.

Düzeltme: `fetchNodeSnapshotOnce(nodePath, kresId)` artık `kresId` parametresi
alıyor ve `query(ref(database, nodePath), orderByChild('kresId'), equalTo(kresId))`
kullanıyor. Üç çağrı yeri (`publishMonth`, `unpublishMonth`,
`copyFromPreviousMonth`) buna göre güncellendi — hepsi zaten `kresId`'yi
parametre olarak alıyordu, ekstra bir prop eklemeye gerek kalmadı. **Bu üç
özellik (Yayından Kaldır, Geçen Ayı Kopyala, doğru pasife alma) daha önce
"Faz 1-2 tamamlandı" denip test edilmemişti — ilk gerçek testi kullanıcı
tarafından henüz yapılmadı, bu yüzden bir sonraki testte özellikle bunlara
bakılmalı.**

---

## Faz 4 — Otomatik Besleme (asıl hedef) ✅ TAMAMLANDI

Bu, kullanıcının "günlük özete ve ders programı yemek listelerine akması" dediği
kısım.

### 4a) `TeacherScheduleScreen.js` — DÜZELTİLDİ
Roadmap'teki 2. seçenek uygulandı: dosya baştan yazıldı, artık
`AdminMonthlyScheduleScreen.js` ile AYNI mantığı (aylık, gün-bazlı kayıt,
Liste/Takvim toggle, Yayınla/Yayından Kaldır, Geçen Ayı Kopyala) kullanıyor —
ama `route.params.sinifId` yerine öğretmenin kendi `currentClass`'ına otomatik
bağlanıyor (öğretmenin ekstra bir sınıf seçmesine gerek yok). Üstte ayrıca
**"Bugün" kartı** eklendi — o günün yayınlanmış etkinliğini gösteriyor.
Firebase kuralları kontrol edildi: `ogretmen` rolü zaten `dersProgramlari`'na
yazma yetkisine sahipti, ek bir izin değişikliği gerekmedi.

### 4b) `ParentSummaryScreen.js` — DÜZELTİLDİ
`todaySchedules` filtresi roadmap'teki öneriye göre `tarih === today` bazlı
yapıldı (`todayMeal`'ın zaten doğru çalışan örneği referans alındı). Ek olarak
küçük bir hata daha bulunup düzeltildi: kayıtların `baslik` alanı her gün için
aynı genel metni tutuyordu ("Ağustos 2026 Ders Programı"), asıl etkinlik adı
`etkinlik` alanındaydı — veli ekranında her gün aynı başlık görünüyordu. Artık
`etkinlik` varsa öncelik ona veriliyor. Eski `getDayKey`/`normalizeDay`
fonksiyonları artık kullanılmıyor (dead code, silinmedi, zararsız).

### 4c) Dashboard kartları — KONTROL EDİLDİ, EK İŞ ÇIKMADI
`TeacherDashboardScreen.js`'de eski modele (`.gunler`) bağlı bozuk bir referans
YOK. `ParentDashboard.js`'de ders programı/schedule ile ilgili hiçbir kod YOK
(o yüzden bozacak bir şey de yoktu). Bu iki dosyada ekstra düzeltme gerekmedi.

---

## Faz 5 — Kopyalama + Arşiv ✅ TAMAMLANDI

**Kopyalama (önceden yapılmıştı):** `monthlyDocuments.js` içinde
`copyFromPreviousMonth()` fonksiyonu zaten yazılmıştı ve hem
`AdminMonthlyMealScreen.js` hem `AdminMonthlyScheduleScreen.js` içinde
"📋 Geçen Ayı Kopyala" butonu olarak bağlıydı.

**Arşiv (bu chat'te eklendi):**
- `monthlyDocuments.js`'e `parseMonthKey()` (getMonthKey'in tersi — `"2026-08"`
  → o ayın 1. günü olan `Date`) ve `listPublishedMonths({ nodePath, kresId,
  kaynak, matchExtra })` eklendi. İkincisi kresId'ye göre filtrelenmiş bir
  sorguyla tüm node'u okuyup, yayınlanmış (aktif) kayıtları `ayKey`'e göre
  gruplayıp gün sayısıyla birlikte (en yeni ay en üstte) döndürüyor.
- `src/components/MonthlyArchivePicker.js` (yeni): "🗂 Arşiv" butonu + modal.
  Açılınca `listPublishedMonths` çağrılıp veri olan aylar listeleniyor, bir aya
  dokununca ekran doğrudan o aya atlıyor (mevcut `changeMonth` gibi +/-1 değil,
  hedef aya direkt — bunun için üç ekrana da `jumpToMonth(date)` fonksiyonu
  eklendi).
- `AdminMonthlyMealScreen.js`, `AdminMonthlyScheduleScreen.js`,
  `TeacherScheduleScreen.js`'de "Geçen Ayı Kopyala" butonunun yanına eklendi
  (aynı satırda, yan yana).

---

## Faz 6 — Eski `dokumanlar` (A4 Foto) Sistemini Kapatma ✅ TAMAMLANDI

**Karar:** Tamamen kaldırıldı (kullanıcı onayladı — kreş henüz canlı değil,
yeni yapılandırılmış sistem her iki belge türünü de kapsıyor, iki paralel
sistemi bir arada tutmanın faydası yoktu).

**Silinen dosyalar:**
- `src/screens/teacher/TeacherDocumentsScreen.js` (A4 foto yükleme — sadece
  `yemekListesi`/`dersProgrami` için kullanılıyordu, doğrulandı)
- `src/screens/parent/ParentDocumentsScreen.js` (aynı `dokumanlar` node'unun
  veli tarafındaki görüntüleyicisi — aynı şekilde sadece bu iki tür için)
- `src/screens/admin/LessonScheduleFormScreen.js` (doğrulanmış ölü kod —
  hiçbir yerden çağrılmıyordu)
- `src/screens/admin/AdminStack.js` (roadmap'te bahsedilen kullanılmayan
  ikinci/kopya dosya — gerçek kullanılan `src/navigation/AdminStack.js`'ten
  farklı, `RootNavigator.js`'in import ettiği hiçbir yerde değildi)

**Güncellenen dosyalar (import + route + menü kaydı temizliği):**
- `src/navigation/TeacherStack.js`, `src/navigation/ParentStack.js`,
  `src/navigation/AdminStack.js` — silinen ekranların import + `Stack.Screen`
  kayıtları kaldırıldı
- `src/screens/teacher/TeacherDashboardScreen.js` — "📁 Dokümanlar" menü
  kartı kaldırıldı
- `src/screens/parent/ParentDashboard.js` — "📁 Belgeler" menü kartı kaldırıldı

**Dokunulmayan:** `database.rules.json`'daki `dokumanlar` node kuralı
kasıtlı olarak silinmedi (artık kullanılmayacak ama kuralı kaldırmak ekstra
risk taşıyan, ayrı bir işlem — istenirse ayrıca yapılabilir). `LegalDocumentsScreen.js`
(KVKK/sözleşme belgeleri — tamamen farklı, ilgisiz bir özellik) hiç dokunulmadı.

---

## Sıradaki Somut Adım (önerilir)

Faz 0-6 tamamlandı, Faz 3'ün veli-tarafı eksiği de kapandı. Bilinen açık iş
kalmadı — sıradaki adım tamamen **kullanıcı testi**: özellikle `expo-print`
gibi yeni native bağımlılık eklendiği için Codemagic'te temiz bir build alınıp
gerçek cihazda denenmesi önemli (yazdır/paylaş/arşiv/yayından kaldır akışları).

Test onaylanınca Faz 7 (Etkinlik Kütüphanesi) ve sonrası için kullanıcı
onayıyla başlanabilir.

---

## Faz 7 — Etkinlik Kütüphanesi ve Etkinlik Öneri Sistemi ✅ TAMAMLANDI (MVP)

**Ne yapıldı:**

1. **Veri modeli genişletildi:** `dersProgramlari` kaydına (`etkinlik` alanının
   yanına) `kategori` (sanat/muzik/hareket/fen/dil/drama/matematik/diger) ve
   opsiyonel `tema` alanları eklendi. Kategori/tema listesi `src/constants.js`
   içinde `ETKINLIK_KATEGORILERI` / `ETKINLIK_TEMALARI` olarak tanımlı.
2. **`etkinlikHavuzu` node'u (yeni, merkezi, TÜM kreşler arasında paylaşılan):**
   `ad, yasGrubu, kategori, tema, toplamKullanim, kresSayisi, sonKullanim`
   alanlarını tutuyor. Okul adı/öğretmen adı/çocuk/sınıf bilgisi İÇERMİYOR.
   `database.rules.json`: `.read: auth != null`, `.write: false` — client
   asla yazamıyor, sadece okuyor.
3. **`_etkinlikHavuzuMeta` node'u (yeni, tamamen gizli):** farklı kreş sayısını
   hesaplamak için gereken `kresId` listesini tutuyor. `.read: false`,
   `.write: false` — sadece Cloud Function (Admin SDK, kuralları by-pass
   eder) erişebiliyor. Anonimlik garantisi bu şekilde güvenlik kuralı
   seviyesinde sağlanmış oldu, client kodunun "göstermemesi"ne güvenmiyoruz.
4. **`functions/index.js` → `updateActivityPoolOnScheduleWrite`:** `dersProgramlari`
   kaydı yazıldığında (etkinlik metni veya kategorisi gerçekten değiştiyse —
   sadece açıklama düzenlemesi tekrar saymıyor) ilgili havuz kaydını
   `transaction()` ile atomik güncelliyor. Yaş grubunu `siniflar/{sinifId}/yasGrubu`'ndan
   otomatik çekiyor.
5. **`src/services/activityLibrary.js` (yeni, sadece okuma):** `searchActivityLibrary({ kategori, yasGrubu, tema, searchText })`
   — kategoriye göre havuzdan çekip, yaş grubu/tema eşleşenleri öne alıp,
   toplam kullanıma göre sıralıyor.
6. **`src/components/ActivityLibraryPicker.js` (yeni, "💡 Etkinlik Öner"):**
   `MonthlyArchivePicker` ile aynı desende bir modal — kategori chip'leri,
   arama kutusu, sonuç listesi (`toplamKullanim` + `kresSayisi` gösterimiyle).
   Bir sonuca dokununca `onSelect(ad)` ile parent'taki `etkinlik` alanına
   tek dokunuşla yazıyor.
7. **Bağlandığı ekranlar:** `TeacherScheduleScreen.js` ve
   `AdminMonthlyScheduleScreen.js`'in gün-düzenleme modalına: Etkinlik Öner
   butonu + Kategori chip seçici + (var olan) Açıklama alanı eklendi.
   `copyFromPreviousMonth` artık kategori/tema'yı da kopyalıyor.
8. **Yazarken-öner (autocomplete) — sonradan eklendi:** `etkinlikHavuzu`
   kayıtlarına `adNormalized` alanı eklendi (Cloud Function yazıyor,
   `.indexOn`'a eklendi). `src/services/activityLibrary.js` →
   `searchActivitiesByPrefix()` — `startAt/endAt` ile TÜM kategoriler
   genelinde prefix (baştan eşleşme) araması yapıyor. Yeni component:
   `src/components/ActivityAutocompleteInput.js` — etkinlik TextInput'ının
   yerine geçti, 2+ karakter yazılınca 300ms debounce ile öneri listesi
   açılıyor; bir öneriye dokununca hem metni hem (öğretmen henüz kendi
   seçmediyse) kategori/tema'yı otomatik dolduruyor. Her iki ekrana da
   bağlandı.

**Bilinçli olarak ERTELENEN (MVP kapsamı dışı, ileride eklenebilir):**
- Silinen/pasife alınan kayıtların havuzdan düşürülmesi — şu an sadece artıyor,
  eksi yönde düzeltme yok (kullanım istatistiği olduğu için kabul edilebilir).
- `yasGrubu` şu an sınıf tarafında serbest metin (örn. "2-3 yaş") — kreşler
  arası tutarsız yazım havuzda tam eşleşmeyi bozabilir; bu yüzden sert filtre
  değil, "öne alma" (soft sort) olarak uygulandı. Faz 8/9'da yaş grubunun
  standart bir seçim listesine (enum) taşınması önerilir.

**Test edilmesi gereken:** Codemagic'te temiz build + fonksiyonların deploy
edilmesi (`firebase deploy --only functions,database`), sonra öğretmen
tarafında bir gün için etkinlik girip yayınlama → havuzda kaydın oluştuğunu
(Firebase Console'dan `etkinlikHavuzu` node'una bakarak) doğrulama → "Etkinlik
Öner"den aynı kaydı görüp seçebilme.

---

## Faz 7 (orijinal plan, referans için saklanıyor)

### Amaç

Öğretmenlerin "Bugün ne etkinlik yapabilirim?" sorusuna hızlı cevap verebilen, Yumurcak kullanıcılarının anonim katkılarıyla sürekli büyüyen merkezi bir etkinlik öneri sistemi oluşturulacaktır.

Bu sistem sosyal ağ veya Pinterest benzeri bir yapı olmayacaktır. Amaç öğretmenlere fikir vermek ve veri girişini hızlandırmaktır.

### Genel Mantık

- Mevcut Etkinlik Kartı altyapısı kullanılacaktır.
- Öğretmen günlük rapora veya etkinlik kartına yeni bir etkinlik girdiğinde sistem anonim olarak merkezi etkinlik havuzunu güncelleyecektir.
- Okul adı, öğretmen adı, çocuk bilgisi veya sınıf bilgisi paylaşılmayacaktır.
- Sadece anonim kullanım istatistikleri tutulacaktır.

### Etkinlik Havuzu

Her etkinlik için;

- Etkinlik Adı
- Yaş Grubu
- Kategori
- Tema (opsiyonel)
- Toplam Kullanım Sayısı
- Farklı Kreş Sayısı
- Son Kullanım Tarihi

saklanacaktır.

### Etkinlik Öner

Öğretmen;

- Yaş Grubu
- Kategori
- Tema

filtrelerini seçerek en çok kullanılan etkinlikleri görebilecektir.

Örnek:

🥇 Parmak Boyası

Toplam kullanım: 2.413

324 farklı kreşte uygulandı

Bu ekrandan seçilen etkinlik tek dokunuşla günlük rapora veya etkinlik kartına aktarılabilecektir.

### Arama

Etkinlik adı yazıldıkça daha önce kullanılan etkinlikler önerilecektir.

### Amaç

Yumurcak zamanla kendi bilgi havuzunu oluşturacak ve öğretmenler her gün uygulamayı yalnızca kayıt girmek için değil, etkinlik fikri almak için de kullanacaktır.

---

## Faz 8 — Kullanıcı Deneyimi ve Verimlilik ⛔ PLANLANDI

Temel sistem tamamlandıktan sonra öğretmenlerin veri giriş süresini azaltacak geliştirmeler yapılacaktır.

### Hazır Etkinlik Önerileri

Etkinlik yazılırken otomatik tamamlama (autocomplete) kullanılacaktır.

Örnek:

Par...

→ Parmak Boyası

→ Parmak Baskısı

→ Parmak Kuklası

### Hazır Yemek Önerileri

Yemek listesi oluşturulurken daha önce kullanılan yemekler önerilecektir.

### Kurumsal PDF

PDF oluşturulurken okulun;

- Logo
- Okul Adı
- Telefon
- Adres
- Müdür

bilgileri ayarlardan otomatik alınacaktır.

### PDF Sonrası Hızlı İşlemler

PDF oluşturulduktan sonra;

- Yazdır
- Paylaş
- İndir

işlemleri tek ekrandan yapılabilecektir.

### Arşiv

Belgeler ay, yıl ve belge türüne göre filtrelenebilecektir.

### Yeni Şablonlar

Aynı altyapı kullanılarak ileride;

- Aylık Bülten
- Nöbet Çizelgesi
- Gezi Formu
- İlaç Takip Formu
- Personel Görev Listesi
- Servis Listesi
- Doğum Günü Takvimi

gibi yeni belge türleri kolayca eklenebilecektir.

# Faz 9 — Öğretmen Verimlilik Araçları

## Amaç

Öğretmenlerin günlük işlemlerini daha hızlı tamamlamasını, eksik kayıt bırakmamasını ve veri giriş süresini azaltmak.

---

## Özellikler

### ✅ Günlük Kontrol Paneli

Öğretmenin ana ekranında o güne ait tamamlanması gereken işlemler gösterilecektir.

Örneğin;

- ☑ Yoklama
- ☑ Günlük Rapor
- ☑ Yemek Listesi
- ☐ Fotoğraf Galerisi
- ☐ Duyuru

Tamamlanan işlemler otomatik işaretlenecek, eksik kalanlar kullanıcıya gösterilecektir.

Bu panel hem gün içerisinde rehber olacak hem de çıkış yapmadan önce son kontrol amacıyla kullanılacaktır.

---

### ✅ Hazır Duyuru Şablonları

Sık kullanılan duyurular tek dokunuşla oluşturulabilecektir.

Örneğin;

- Gezi
- Aidat
- Toplantı
- Tatil
- Etkinlik
- Veli Bilgilendirmesi

Öğretmen yalnızca gerekli alanları düzenleyerek saniyeler içerisinde duyuru paylaşabilecektir.

---

### ✅ Otomatik Tamamlama

Etkinlik ve yemek listesi oluşturulurken daha önce kullanılan içerikler önerilecektir.

Bu sayede tekrar eden veri girişleri minimuma indirilecektir.

---

# Faz 10 — Akıllı Etkinlik Yönetimi

## Amaç

Öğretmenlerin etkinlik planlamasını kolaylaştırmak, etkinlik çeşitliliğini artırmak ve tekrar eden etkinlikleri azaltmak.

---

## Özellikler

### ✅ Etkinlik Dengesi Analizi

Sistem ay içerisinde yapılan etkinlikleri kategori bazında analiz edecektir.

Örneğin;

- 🎨 Sanat : 12
- 🎵 Müzik : 8
- 🏃 Hareket : 5
- 🧪 Fen : 1
- 📖 Dil : 4

Eksik kalan kategoriler öğretmene öneri olarak gösterilecektir.

Bu analiz tamamen mevcut veriler üzerinden yapılacak olup yapay zeka kullanılmayacaktır.

---

### ✅ Aynı Gün Geçen Yıl

Öğretmen yeni etkinlik oluştururken;

"Geçen yıl bugün bu sınıfta hangi etkinlik yapılmış?"

bilgisini görüntüleyebilecektir.

Bu sayede aynı etkinliklerin sürekli tekrar edilmesi önlenecektir.

---

### ✅ Hazır Kazanımlar

Etkinlik seçildiğinde sistem ilgili etkinlik için daha önce tanımlanmış kazanımları önerecektir.

Örneğin;

Parmak Boyası

↓

- İnce Motor
- El-Göz Koordinasyonu
- Renk Algısı
- Yaratıcılık

Öğretmen isterse kazanımları değiştirebilecek veya yeni kazanımlar ekleyebilecektir.

---

### ✅ Akıllı Tekrar Uyarısı

Öğretmen kısa süre içerisinde aynı etkinliği tekrar seçtiğinde sistem bilgi verecektir.

Örneğin;

"Bu etkinlik son 10 gün içerisinde 3 kez uygulanmış."

Bu yalnızca bilgilendirme amaçlı olacak, öğretmenin seçimini engellemeyecektir.

---

# Faz 11 — Öğretmen Kişisel Kütüphanesi

## Amaç

Her öğretmenin yıllar içerisinde kendi etkinlik arşivini oluşturmasını ve en sevdiği etkiniklere saniyeler içerisinde ulaşmasını sağlamak.

---

## Özellikler

### ✅ Favori Etkinlikler

Öğretmen beğendiği etkinlikleri favorilerine ekleyebilecektir.

---

### ✅ Son Kullanılan Etkinlikler

Son kullanılan etkinlikler tek dokunuşla tekrar seçilebilecektir.

---

### ✅ Kişisel Etkinlik Arşivi

Öğretmenin oluşturduğu tüm etkinlikler kendi hesabında saklanacaktır.

---

### ✅ Kişisel Arama

Öğretmen yalnızca kendi etkinlikleri içerisinde arama yapabilecektir.

---

### ✅ Favorilerden Plan Oluştur

Yeni plan hazırlanırken yalnızca favori etkinliklerden seçim yapılabilecektir.

---

# Faz 12 — Merkezi İçerik Platformu

## Amaç

Yumurcak'ı yalnızca yönetim uygulaması olmaktan çıkarıp öğretmenlerin her gün fikir aldığı ve kullandığı merkezi bir içerik platformuna dönüştürmek.

---

## Özellikler

### ✅ Merkezi Etkinlik Havuzu

Tüm kullanıcıların anonim olarak oluşturduğu etkinliklerden oluşan ortak havuz.

---

### ✅ En Çok Kullanılan Etkinlikler

Yaş grubuna göre en çok uygulanan etkinlikler görüntülenebilecektir.

---

### ✅ Yaş Grubuna Göre Filtreleme

- 2 Yaş
- 3 Yaş
- 4 Yaş
- 5 Yaş
- 6 Yaş

---

### ✅ Kategoriye Göre Filtreleme

- Sanat
- Fen
- Drama
- Müzik
- Hareket
- Dil
- Matematik

---

### ✅ Tema Filtreleri

- Sonbahar
- Kış
- İlkbahar
- Yaz
- 23 Nisan
- 29 Ekim
- Anneler Günü
- Babalar Günü
- Yerli Malı Haftası
- vb.

---

### ✅ Tek Dokunuşla Kullan

Öğretmen beğendiği etkinliği seçerek tek dokunuşla günlük rapora veya etkinlik kartına aktarabilecektir.

Etkinlik üzerinde gerekli düzenlemeleri yaptıktan sonra kullanmaya devam edebilecektir.
