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

## Faz 3 — Şablon / PDF Render Servisi ⛔ YAPILMADI

**Yapılacaklar:**
1. `expo-print` paketini ekle (`package.json`'da yok, kurulması lazım: `npx expo install expo-print expo-sharing`).
2. Yapılandırılmış veriden (bir ayın `days` + `values`) A4 HTML template üreten
   bir fonksiyon yaz: `src/services/documentPdf.js` gibi. İçerik: okul logosu,
   okul adı, ay/yıl, tablo (gün/etkinlik veya gün/öğünler), imza alanı.
3. Okul bilgileri (logo, ad, telefon, adres, müdür) `AdminInstitutionSettingsScreen`'in
   yazdığı node'dan otomatik çekilmeli — PDF'de tekrar girilmeyecek. Bu node'un
   tam yolunu bulmak için `src/screens/admin/AdminInstitutionSettingsScreen.js`
   dosyasına bakılmalı (bu chat'te henüz incelenmedi).
4. Önizleme ekranı: HTML'i bir `WebView` veya `expo-print`'in `printAsync` /
   `printToFileAsync` fonksiyonlarıyla önizle, sonra İndir / Paylaş / Yazdır butonları.
5. Hem admin/öğretmen tarafında (kendi belgesini görmek için) hem veli tarafında
   (yayınlanan belgeyi PDF gibi görüp indirmek için) AYNI renderer çağrılmalı —
   iki farklı PDF üretim kodu OLMAMALI.

---

## Faz 4 — Otomatik Besleme (asıl hedef) ⛔ YAPILMADI — ÖNCELİKLİ

Bu, kullanıcının "günlük özete ve ders programı yemek listelerine akması" dediği
kısım. İki ayrı kırık nokta tespit edildi, ikisi de düzeltilmeli:

### 4a) `TeacherScheduleScreen.js` — BOZUK
Şu an hâlâ eski modeli okuyor: `schedules.find(item => item.sinifId === currentClass.id).gunler`.
Yeni modelde `schedules` artık bir sınıfın BİRDEN FAZLA gün-kaydını içeriyor,
`.gunler` diye bir alan yok. Bu ekran ya:
- `TeacherMealsScreen.js`'in yaptığı gibi (bkz. `mergeTodayMeal` fonksiyonu,
  `TeacherMealsScreen.js` içinde) "bugünün kaydını bul + öğretmenin günlük override'ı
  varsa onu göster" mantığına çevrilmeli, YA DA
- Tamamen kaldırılıp yerine `AdminMonthlyScheduleScreen`'in öğretmen-görebilir bir
  versiyonu konmalı (öğretmenin kendi sınıfının aylık programını görüp, izin
  varsa düzenlemesi).

Karar: muhtemelen ikinci seçenek daha temiz (tek ekran, admin ve öğretmen aynı
component'i farklı yetki seviyesiyle kullanır) — ama bu, önceki konuşmada
netleşmedi, kullanıcıya sorulmalı.

### 4b) `ParentSummaryScreen.js` — "Bugünün Programı" widget'ı sessizce boş dönüyor
`todaySchedules` hesaplaması (satır ~162-171) `item.gun` (haftanın günü, örn.
"pazartesi") alanına göre filtreliyor + `normalizeDay()` fonksiyonu kullanıyor.
Bizim yeni kayıtlarımızda `gun` alanı YOK, `tarih` (tam tarih, `"2026-08-05"`) var.
Bu ikisi hiç eşleşmiyor — düzeltme:
```js
const todaySchedules = useMemo(() => {
  const todayKey = new Date().toISOString().slice(0, 10);
  return schedules
    .filter((item) => item.aktif !== false)
    .filter((item) => !kresId || !item.kresId || item.kresId === kresId)
    .filter((item) => !item.sinifId || item.sinifId === sinifId)
    .filter((item) => item.tarih === todayKey)
    .slice(0, 3);
}, [schedules, kresId, sinifId]);
```
Aynı dosyada yemek listesi için muhtemelen zaten benzer/doğru bir `tarih === today`
filtresi var (satır ~157 civarı `mealList` için) — o örnek alınabilir.

### 4c) Dashboard kartları
`TeacherDashboardScreen.js` ve `ParentDashboard.js`'de varsa benzer "bugün ne var"
kartları da aynı `tarih === today` mantığıyla bu yeni node'lardan beslenmeli.
(Bu iki dosya bu chat'te henüz detaylı incelenmedi — kontrol edilmeli.)

---

## Faz 5 — Kopyalama + Arşiv ⛔ KISMEN YAPILDI

**Yapılan:** `monthlyDocuments.js` içinde `copyFromPreviousMonth()` fonksiyonu
zaten yazıldı ve hem `AdminMonthlyMealScreen.js` hem `AdminMonthlyScheduleScreen.js`
içinde "📋 Geçen Ayı Kopyala" butonu olarak bağlandı. Önceki ayın yayınlanmış
(aktif) kayıtlarını gün numarasına göre eşleyip mevcut ayın taslağına kopyalıyor.

**Yapılmayan:** Arşiv görüntüleme — yani "Temmuz", "Haziran" gibi eski ayları
geriye dönük AÇIP GÖRÜNTÜLEME ekranı yok. Şu an sadece mevcut ay ileri/geri
gezilebiliyor (`changeMonth` fonksiyonu zaten `-1`/`+1` ay kaydırıyor, o yüzden
teknik olarak geçmiş aya gidip verisini görmek MÜMKÜN ama "hangi aylarda veri
var" listesi/gösterge yok — kullanıcı ay ay elle gezmek zorunda). İstenirse:
küçük bir "veri olan aylar" işaretleyicisi eklenebilir.

---

## Faz 6 — Eski `dokumanlar` (A4 Foto) Sistemini Kapatma ⛔ YAPILMADI

`src/screens/teacher/TeacherDocumentsScreen.js` (A4 foto yükleme, `dokumanlar`
node'u) hâlâ duruyor ve dokunulmadı. Yeni akış (Faz 3-4) stabil olduktan sonra:
- Ya tamamen kaldır (ekran + navigasyon + `dokumanlar` node'u artık kullanılmıyor),
- Ya da "okulun kendi hazır PDF'ini yüklemek istemesi" gibi nadir durumlar için
  opsiyonel yedek olarak bırak.

Ayrıca temizlik: `src/screens/admin/LessonScheduleFormScreen.js` artık hiçbir
yerden çağrılmıyor (Faz 1'de `AdminMonthlySchedule` onun yerini aldı) — doğrulanıp
silinebilir. `src/screens/teacher/TeacherScheduleScreen.js` Faz 4a'da ele
alınınca bu dosya da ya güncellenecek ya da kaldırılacak.

**Bilgi notu:** Repo'da `src/screens/admin/AdminStack.js` diye kullanılmayan
(dead code) ikinci bir dosya var — gerçek kullanılan `src/navigation/AdminStack.js`.
Kafa karıştırmasın diye bu da bir noktada temizlenmeli, ama acil değil.

---

## Sıradaki Somut Adım (önerilir)

Faz 4a + 4b birlikte: `TeacherScheduleScreen.js`'i yeniden yaz (öğretmenin kendi
sınıfının aylık programını görmesi + varsa bugünün etkinliğini üstte kart olarak
göstermesi) ve `ParentSummaryScreen.js`'deki `todaySchedules` filtresini `tarih`
bazlı yap. Bu ikisi bitince "tek veri girişi → otomatik günlük özet" zinciri
uçtan uca çalışır hale gelir (Faz 3'teki PDF olmadan bile).


---

## Faz 7 — Etkinlik Kütüphanesi ve Etkinlik Öneri Sistemi ⛔ PLANLANDI

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
