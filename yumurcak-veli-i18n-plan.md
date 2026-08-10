# Yumurcak — Veli Tarafı İngilizce Dil Desteği Planı

Kapsam: sadece veli (parent) taraf. Öğretmen, admin, super admin, Firebase
functions dosyalarına dokunulmuyor. Varsayılan dil her fazda Türkçe kalır;
en.json dolsa bile dil seçici eklenene (Faz 5) kadar hiçbir ekranda
İngilizce görünmez.

Gelecekte 3. bir dil (örn. Almanca) eklemek için sadece yeni bir
`src/locales/de.json` + `i18n.js`'e 1 satır + dil seçiciye 1 seçenek
yeterli olacak — ekran/component dosyalarına tekrar dokunulmayacak.

---

## Faz 1 — Altyapı kurulumu ✅

**Yeni dosyalar:**
- `src/i18n.js` — i18next init, AsyncStorage'dan dil okuma/yazma, cihaz dili algılama
- `src/locales/tr.json` — boş iskelet (bölüm başlıkları: common, parent)
- `src/locales/en.json` — boş iskelet (aynı yapı)
- `src/context/LanguageContext.js` — dil değiştirme fonksiyonunu uygulamaya yayan context

**Değişecek dosyalar:**
- `package.json` — `i18next`, `react-i18next`, `expo-localization` eklenir
- `App.js` — `import './src/i18n'` + `LanguageProvider` ile sarmalama

**Sonuç:** Uygulama hâlâ birebir eskisi gibi çalışır, hiçbir ekran metni değişmez. Sadece altyapı hazır olur.

---

## Faz 2 — Paylaşılan component'lerin çevirisi

**Değişecek dosyalar (13):**
- `src/components/Card.js` ✅
- `src/components/Button.js`✅
- `src/components/Loading.js`✅
- `src/components/DailyCommentCard.js`✅
- `src/components/MealTodayCard.js`✅
- `src/components/DailyChecklistCard.js`✅
- `src/components/ActivityBalanceCard.js`✅
- `src/components/MonthlyDocumentPdfBar.js`✅
- `src/components/MonthlyCalendarView.js`✅
- `src/components/AppSuccessToast.js`✅
- `src/components/ReportCard.js`✅
- `src/components/SegmentedTabs.js`✅
- `src/components/AppNotificationButton.js`✅

**Güncellenecek:**
- `src/locales/tr.json` / `en.json` — `common` bölümü doldurulur (Kaydet, İptal, Yükleniyor, Hata mesajları vb.)

**Sonuç:** Bu component'leri kullanan tüm veli ekranları otomatik hazır hale gelmeye başlar (Faz 4'ü hızlandırır). Görünür değişiklik yok, dil hâlâ Türkçe.

---

## Faz 3 — Navigasyon başlıkları

**Değişecek dosyalar (1):**
- `src/navigation/ParentStack.js` — tab bar ve ekran başlıkları✅

**Güncellenecek:**
- `src/locales/tr.json` / `en.json` — `nav` bölümü eklenir✅

---

## Faz 4 — 25 veli ekranının çevirisi

Ekran ekran, tam dosya olarak teslim edilecek. Sıra (kullanım sıklığına göre):

1. `ParentSummaryScreen.js`✅
2. `ParentDashboard.js`✅
3. `ParentScheduleScreen.js`
4. `ParentMealsScreen.js`
5. `ParentAnnouncementsScreen.js`
6. `ParentAttendanceScreen.js`
7. `ParentMessagesScreen.js`
8. `ParentEventsScreen.js`
9. `ParentGalleryScreen.js`
10. `ParentGalleryScreenOptimized.js`
11. `ParentDevelopmentScreen.js`
12. `ParentBadgesScreen.js`
13. `ParentBellScreen.js`
14. `ParentContactScreen.js`
15. `ParentMedicalScreen.js`
16. `ParentPaymentsScreen.js`
17. `ParentPollsScreen.js`
18. `ParentReportsScreen.js`
19. `ParentServiceScreen.js`
20. `ParentSupportScreen.js`
21. `ParentAboutScreen.js`
22. `ParentAdaptationScoreScreen.js`
23. `ChildReportScreen.js`
24. `parentShared.js` (yardımcı metin/format fonksiyonları varsa)
25. `ParentProfileScreen.js`

**Güncellenecek:**
- `src/locales/tr.json` / `en.json` — `parent` bölümü, her ekran tamamlandıkça büyür

**Sonuç:** Her ekran teslim edildikçe GitHub'a atılabilir, aradaki ekranlar bozulmadan uygulama çalışmaya devam eder.

---

## Faz 5 — Dil seçici

**Değişecek dosyalar (1):**
- `src/screens/parent/ParentProfileScreen.js` — "Türkçe / English" seçici eklenir, seçim `AsyncStorage`'a yazılır ve anında uygulamaya yansır

**Sonuç:** Bu faz bitene kadar İngilizce hiçbir yerde görünmüyordu — ilk kez burada kullanıcıya açılıyor.

---

## Toplam özet

| Faz | Yeni dosya | Değişen dosya |
|---|---|---|
| 1 | 4 | 2 |
| 2 | 0 | 13 |
| 3 | 0 | 1 |
| 4 | 0 | 25 |
| 5 | 0 | 1 (Faz 4 listesinde zaten sayılı) |

**Dokunulmayan alanlar:** `src/screens/teacher/*`, `src/screens/admin/*`, `src/screens/superadmin/*`, `functions/*`, `AuthStack.js`, `AdminStack.js`, `TeacherStack.js`, `SuperAdminStack.js`, Firebase servis dosyaları.
