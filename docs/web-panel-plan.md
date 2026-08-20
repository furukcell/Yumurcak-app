# Yumurcak — Web Yönetim Paneli Planı

> Bu dosya, sohbet limiti bitip başka bir hesap/oturumla devam edilmesi
> ihtimaline karşı yazıldı. Yeni bir Claude oturumu bu dosyayı okuyup
> kaldığı fazdan devam edebilmeli. Her faz bitince ilgili kutucuğu
> `[x]` yapıp commit'le — böylece nerede kalındığı hep bu dosyadan
> anlaşılır.

## Karar Verilen Mimari

- **Ayrı bir web uygulaması** yazılıyor, mevcut mobil (Expo/React Native)
  koduna dokunulmuyor. Aynı Firebase projesini kullanıyor (aynı Auth,
  aynı Realtime Database, aynı Storage) — yani veri tek yerde, iki farklı
  arayüz (mobil + web) o veriyi okuyup yazıyor.
- **Neden ayrı proje:** Mobil kod `react-native-purchases`, `expo-media-library`,
  `react-native-reanimated`/`worklets` gibi web'de çalışmayan/sorunlu
  paketler kullanıyor. Expo Web (react-native-web) ile mevcut kodu web'e
  açmak bu paketler yüzünden yamalı ve kırılgan olurdu. Ayrıca telefon
  ekranı için tasarlanmış arayüz masaüstünde doğal durmuyor — panelin
  tablo/filtre/toplu işlem gibi masaüstüne özel ihtiyaçları var.
- **Kim kullanacak:** Sadece kreş admini (müdür/sahip). Süper-admin veya
  başka rol şimdilik kapsam dışı.
- **Kapsam:** Mevcut admin mobil uygulamasındaki ekranların birebir web
  karşılığı, fazlara bölünerek.

## Teknoloji Seçimi

| Katman | Seçim | Neden |
|---|---|---|
| Framework | React + Vite | Basit, hızlı, GitHub web editöründen düzenlemesi kolay |
| Backend/veri | Firebase JS SDK (web) — `firebase/database`, `firebase/auth`, `firebase/storage` | Mobildeki `ref`, `onValue`, `query`, `orderByChild` API'leriyle birebir aynı — öğrenme maliyeti yok |
| UI kütüphanesi | Ant Design (`antd`) | Tablo, form, filtre gibi admin bileşenleri hazır geliyor, CRUD ekranlarını hızlandırıyor |
| Hosting | Firebase Hosting | Firebase projesiyle zaten entegre, ücretsiz katman yeterli |
| CI/CD | GitHub Actions → Firebase Hosting | `main`'e push'ta otomatik build+deploy. Local ortam GEREKMİYOR — mevcut "GitHub web editör + otomatik deploy" alışkanlığına uygun |
| Auth | Aynı Firebase Auth, aynı `kullanicilar` node'u | Admin zaten mobilde kullandığı email/şifreyle web'de de giriş yapar. Rol kontrolü: `kullanicilar/{uid}.rol === 'admin'` |

### Firebase Config (zaten kayıtlı, yeni oluşturmaya gerek yok)

`appId` içinde `web:` ön eki olan bir web app zaten Firebase projesinde
tanımlı. Mobil `src/config/firebase.js` dosyasındaki `firebaseConfig`
objesi birebir web projesinde de kullanılabilir (bu değerler zaten public/
client-side, mobil app bundle'ında da açık duruyor, gizli değil).

## Fazlar

### Faz 0 — Proje İskeleti 
- [x] Yeni repo: `yumurcak-web-panel` (GitHub'da furukcell altında)
- [x] `npm create vite@latest` ile React + JS (TS değil, mobildeki gibi JS kalsın — tutarlılık)
- [x] `firebase`, `antd`, `react-router-dom` paketleri kurulur
- [x] `src/config/firebase.js` — mobildeki config'in birebir kopyası
- [x] Firebase Hosting init (`firebase.json`, `.firebaserc`) — `public: dist`
- [x] GitHub Actions workflow (`.github/workflows/deploy.yml`) — `main`'e push'ta `npm run build` + Firebase Hosting deploy
- [x] Giriş ekranı (email/şifre, `firebase/auth` `signInWithEmailAndPassword`)
- [x] Giriş sonrası `kullanicilar/{uid}` okunup `rol === 'admin'` kontrolü — değilse erişim reddedilir
- [x] Panel iskeleti: sol menü (Ant Design `Layout` + `Menu`) + üst bar (kreş adı, çıkış butonu)
- [x] Boş Dashboard sayfası (sadece "Hoş geldin" — asıl içerik Faz 1'de)

### Faz 1 — Dashboard + İstatistik
- [ ] Dashboard: özet kartlar (toplam çocuk, öğretmen, bugünkü rapor sayısı vb.) — mobildeki `DashboardScreen.js`'deki `kresOzetleri` node'undan besleniyor
- [ ] İstatistik sayfası — mobildeki `AdminStatisticsScreen.js` mantığının web karşılığı (grafik için `recharts` veya `antd`'nin kendi chart bileşeni eklenebilir)

### Faz 2 — Çekirdek Yönetim (CRUD)
- [ ] Çocuklar (liste + ekle/düzenle) — mobil: `ChildListScreen.js`, `ChildFormScreen.js`, `ChildDetailScreen.js`
- [ ] Öğretmenler — mobil: `TeacherListScreen.js`, `TeacherFormScreen.js`
- [ ] Veliler — mobil: `VeliListScreen.js`, `VeliFormScreen.js`
- [ ] Sınıflar — mobil: `ClassListScreen.js`, `ClassFormScreen.js`

### Faz 3 — İletişim
- [ ] Duyurular — mobil: `AnnouncementListScreen.js`, `AnnouncementFormScreen.js`
- [ ] Etkinlikler — mobil: `EventListScreen.js`, `EventFormScreen.js`
- [ ] Anket Yönetimi — mobil: `PollManagementScreen.js`
- [ ] Mesajlar — mobil: `AdminMessagesScreen.js`, `MessageDetailScreen.js`

### Faz 4 — Operasyonel
- [ ] Aylık Yemek Listesi — mobil: `AdminMonthlyMealScreen.js`
- [ ] Ders Programı — mobil: `LessonScheduleListScreen.js`, `AdminMonthlyScheduleScreen.js`
- [ ] Nöbet Çizelgesi — mobil: `AdminMonthlyDutyRosterScreen.js`
- [ ] Personel Görev Listesi — mobil: `AdminMonthlyStaffTasksScreen.js`
- [ ] Servis — mobil: `AdminServiceScreen.js`, `AdminVehicleListScreen.js`, `AdminVehicleFormScreen.js`, `AdminServiceStatsScreen.js`, `AdminServiceMonthlyStatsScreen.js`
- [ ] Doğum Günü Takvimi — mobil: `AdminBirthdayCalendarScreen.js`

### Faz 5 — Finans
- [ ] Ödemeler — mobil: `PaymentListScreen.js`, `PaymentFormScreen.js`
- [ ] (İleride) Muhasebe modülü — ayrı bir konuşmada planlandı: Gider Takibi, İzin Yönetimi, Personel Hakediş Takibi, Yıllık Maliyet Özeti. Bordro Hesaplama kapsam dışı bırakıldı (gerçek bordro muhasebeciye/harici yazılıma bırakılacak).

### Faz 6 — Ayarlar
- [ ] Kurum Bilgileri — mobil: `AdminInstitutionSettingsScreen.js`
- [ ] Tema Ayarları — mobil: `AdminThemeScreen.js`
- [ ] Abonelik / Ödeme — mobil: `AdminSubscriptionScreen.js`
- [ ] Kurum Zili — mobil: `AdminBellScreen.js`
- [ ] Yasal Belgeler — mobil: `LegalDocumentsScreen.js`

## Genel Notlar / Dikkat Edilecekler

- **Firebase rules:** Mobil tarafta bazı node'lar (`gunlukRaporlar`, `yoklamalar`
  vb.) sadece `orderByChild('kresId').equalTo(...)` sorgusuna izin veriyor
  (bkz. `database.rules.json`). Web tarafında da aynı sorgu şeklini
  kullanmak gerekiyor, "tüm node'u oku" web'de de reddedilecek.
- **Performans:** Mobil tarafta konuşulan "sınırsız büyüyen node" sorunu
  (bkz. proje geçmişi) web panelde de geçerli olacak — özellikle
  Çocuklar/Öğretmenler gibi listeler değil ama Raporlar/Yoklama gibi
  zamanla büyüyen veriler için web tarafında da tarih/limit filtresi
  düşünülmeli. Bu ayrıca ele alınacak, Faz 2/4'te ilgili ekran
  yazılırken hatırlanmalı.
- **Yazma izinleri:** Panel sadece admin'e açık olacağı için, admin'in
  zaten mobilde yazma yetkisi olan node'lara (children, teachers, vb.)
  web'den de aynı kurallarla yazması sorun olmamalı — rules zaten
  `rol === 'admin'` bazlı çalışıyor, kullanıcı bazlı değil, platform
  bazlı değil.
- **Tasarım:** Yeni bir görsel kimlik gerekmiyor, mobildeki `THEME`
  renklerini (`src/screens/teacher/teacherShared.js` içindeki `THEME`
  objesi — mor/primary `#6C3DEB` vb.) web tarafında da kullanmak
  tutarlılık sağlar.

## Şu Anki Durum

Henüz hiçbir kod yazılmadı — bu dosya sadece plan. Bir sonraki adım
**Faz 0**'dan başlamak.
