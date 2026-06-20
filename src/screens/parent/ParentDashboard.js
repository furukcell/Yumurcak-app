// ============================================================
// YUMURCAK — ParentDashboard.js
// Modern veli arayüzü — ana sayfa, raporlar, duyurular, profil
// + Hızlı işlem ekranları (local state navigation)
// + Yemek Listesi (Firebase yemekListeleri node)
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  orange: '#FF9F1C',
  green: '#20B45B',
  red: '#FF4D6D',
  blue: '#3A7BFF',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

const GUNLER = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma'];
const GUN_LABEL = {
  pazartesi: 'Pazartesi',
  sali: 'Salı',
  carsamba: 'Çarşamba',
  persembe: 'Perşembe',
  cuma: 'Cuma',
};

// Placeholder ekran tanımları (meals çıkarıldı — gerçek ekrana geçti)
const PLACEHOLDER_SCREENS = {
  messages: {
    icon: '💬',
    title: 'Mesajlar',
    description: 'Mesajlaşma özelliği yakında aktif olacak.',
    color: '#3A7BFF',
    bgColor: '#EEF4FF',
  },
  gallery: {
    icon: '🖼️',
    title: 'Galeri',
    description: 'Fotoğraf galerisi yakında aktif olacak.',
    color: '#FF9F1C',
    bgColor: '#FFF6E8',
  },
  documents: {
    icon: '📁',
    title: 'Belgeler',
    description: 'Belgeler yakında aktif olacak.',
    color: '#6C3DEB',
    bgColor: '#EFE8FF',
  },
};

export default function ParentDashboardScreen() {
  const { kullanici, cikisYap } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  // currentScreen: 'main' | 'messages' | 'gallery' | 'documents' | 'meals' | 'mealDetail'
  const [currentScreen, setCurrentScreen] = useState('main');
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [children, setChildren] = useState([]);
  const [reports, setReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [yemekListeleri, setYemekListeleri] = useState([]);
  const [loading, setLoading] = useState(true);

  const parentId = kullanici?.uid || kullanici?.id;
  const selectedChild = children[0];
  const kresId = selectedChild?.kresId || kullanici?.kresId || null;

  // ─── Firebase: Çocuklar ──────────────────────────────────────
  useEffect(() => {
    if (!parentId) {
      setLoading(false);
      return undefined;
    }
    const childrenRef = ref(database, 'cocuklar');
    const unsubscribe = onValue(childrenRef, (snapshot) => {
      const data = snapshot.val();
      const myChildren = [];
      if (data) {
        Object.entries(data).forEach(([id, childData]) => {
          if (childData.veliIds?.includes(parentId)) {
            myChildren.push({ id, ...childData });
          }
        });
      }
      setChildren(myChildren);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [parentId]);

  // ─── Firebase: Günlük Raporlar ───────────────────────────────
  useEffect(() => {
    const reportsRef = ref(database, 'gunlukRaporlar');
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      const data = snapshot.val();
      const list = [];
      if (data) {
        Object.entries(data).forEach(([id, reportData]) => {
          list.push({ id, ...reportData });
        });
      }
      list.sort((a, b) => String(b.tarih || '').localeCompare(String(a.tarih || '')));
      setReports(list);
    });
    return () => unsubscribe();
  }, []);

  // ─── Firebase: Duyurular ─────────────────────────────────────
  useEffect(() => {
    const duyuruRef = ref(database, 'duyurular');
    const unsubscribe = onValue(duyuruRef, (snapshot) => {
      const data = snapshot.val();
      const list = [];
      if (data) {
        Object.entries(data).forEach(([id, item]) => {
          list.push({ id, ...item });
        });
      }
      list.sort((a, b) =>
        String(b.tarih || b.createdAt || '').localeCompare(String(a.tarih || a.createdAt || ''))
      );
      setAnnouncements(list);
    });
    return () => unsubscribe();
  }, []);

  // ─── Firebase: Yemek Listeleri ───────────────────────────────
  useEffect(() => {
    const yemekRef = ref(database, 'yemekListeleri');
    const unsubscribe = onValue(yemekRef, (snapshot) => {
      const data = snapshot.val();
      const list = [];
      if (data) {
        // Son 3 ay filtresi
        const now = new Date();
        const ucAyOnce = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

        Object.entries(data).forEach(([id, item]) => {
          if (item.aktif === false) return;

          // kresId filtresi (kresId varsa uygula)
          if (!kresId) return;
          if (item.kresId !== kresId) return;

          // Tarih filtresi
          const baslangic = item.baslangicTarihi
            ? new Date(item.baslangicTarihi)
            : item.createdAt
            ? new Date(item.createdAt)
            : null;
          if (baslangic && baslangic < ucAyOnce) return;

          list.push({ id, ...item });
        });

        // Yeniden eskiye sırala
        list.sort((a, b) => {
          const aDate = a.baslangicTarihi || String(a.createdAt || '');
          const bDate = b.baslangicTarihi || String(b.createdAt || '');
          return String(bDate).localeCompare(String(aDate));
        });
      }
      setYemekListeleri(list);
    });
    return () => unsubscribe();
  }, [kresId]);

  // ─── Hesaplanan değerler ──────────────────────────────────────
  const childReports = useMemo(() => {
    if (!selectedChild?.id) return [];
    return reports.filter((item) => item.cocukId === selectedChild.id);
  }, [reports, selectedChild?.id]);

  const todayReport = childReports[0];

  const getChildName = () => selectedChild?.ad || selectedChild?.adSoyad || 'Çocuğum';
  const getParentName = () =>
    `${kullanici?.ad || ''} ${kullanici?.soyad || ''}`.trim() ||
    kullanici?.kullaniciAdi ||
    'Veli';
  const getMood = (report) => report?.mood || report?.ruhHali || report?.durum || 'Mutlu';
  const getMeal = (report) => {
    if (!report) return 'İyi';
    if (report.yemekDurumu) return report.yemekDurumu;
    if (report.yemek?.kahvalti || report.yemek?.ogle || report.yemek?.araOgun) return 'İyi';
    return 'İyi';
  };
  const getSleep = (report) => {
    if (!report) return 'İyi';
    if (report.uyku?.sure) return `${report.uyku.sure} saat`;
    if (report.uykuDurumu) return report.uykuDurumu;
    return 'İyi';
  };
  const getAttendance = () => (selectedChild ? 'Geldi' : '-');
  const getTeacherNote = (report) =>
    report?.not || report?.ogretmenNotu || report?.notlar || 'Bugün için henüz öğretmen notu girilmedi.';

  const handleLogout = async () => {
    await cikisYap();
  };

  const openScreen = (screen) => {
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (currentScreen === 'mealDetail') {
      setCurrentScreen('meals');
    } else {
      setCurrentScreen('main');
    }
  };

  const openMealDetail = (meal) => {
    setSelectedMeal(meal);
    setCurrentScreen('mealDetail');
  };

  // ─── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>Veli ekranı hazırlanıyor...</Text>
      </View>
    );
  }

  // ─── Yemek Listesi Ekranı ─────────────────────────────────────
  if (currentScreen === 'meals') {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderMealsScreen()}
      </SafeAreaView>
    );
  }

  // ─── Yemek Detay Ekranı ───────────────────────────────────────
  if (currentScreen === 'mealDetail') {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderMealDetailScreen()}
      </SafeAreaView>
    );
  }

  // ─── Placeholder Ekranlar ─────────────────────────────────────
  if (currentScreen !== 'main') {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderPlaceholderScreen(currentScreen)}
      </SafeAreaView>
    );
  }

  // ─── Ana Dashboard ────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        {activeTab === 'home' ? renderHome() : null}
        {activeTab === 'reports' ? renderReports() : null}
        {activeTab === 'announcements' ? renderAnnouncements() : null}
        {activeTab === 'profile' ? renderProfile() : null}
        {renderTabBar()}
      </View>
    </SafeAreaView>
  );

  // ════════════════════════════════════════════════════════════
  // YEMEK LİSTESİ EKRANLARI
  // ════════════════════════════════════════════════════════════

  function renderMealsScreen() {
    return (
      <View style={styles.placeholderRoot}>
        <View style={styles.placeholderHeader}>
          <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.75}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backLabel}>Geri</Text>
          </TouchableOpacity>
          <Text style={styles.placeholderHeaderTitle}>Yemek Listesi</Text>
          <View style={styles.backButtonSpacer} />
        </View>

        <ScrollView
          style={styles.placeholderScroll}
          contentContainerStyle={styles.placeholderContent}
          showsVerticalScrollIndicator={false}
        >
          {yemekListeleri.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>Henüz yemek listesi eklenmemiş.</Text>
              <Text style={styles.emptyDesc}>Kreş yemek listesi girdiğinde burada görünecek.</Text>
            </View>
          ) : (
            yemekListeleri.map((item) => renderMealCard(item))
          )}
        </ScrollView>
      </View>
    );
  }

  function renderMealCard(item) {
    const isHaftalik = item.tip === 'haftalik';
    return (
      <View key={item.id} style={styles.mealCard}>
        <View style={styles.mealCardTop}>
          <View style={[styles.mealTipBadge, isHaftalik ? styles.mealTipHaftalik : styles.mealTipAylik]}>
            <Text style={[styles.mealTipText, isHaftalik ? styles.mealTipTextHaftalik : styles.mealTipTextAylik]}>
              {isHaftalik ? '📅 Haftalık' : '🗓️ Aylık'}
            </Text>
          </View>
        </View>
        <Text style={styles.mealCardTitle}>{item.baslik || 'Yemek Listesi'}</Text>
        <Text style={styles.mealCardDate}>
          {item.baslangicTarihi || '-'} – {item.bitisTarihi || '-'}
        </Text>
        <TouchableOpacity
          style={styles.mealDetailButton}
          onPress={() => openMealDetail(item)}
          activeOpacity={0.85}
        >
          <Text style={styles.mealDetailButtonText}>Detayı Gör →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderMealDetailScreen() {
    if (!selectedMeal) return null;
    const isHaftalik = selectedMeal.tip === 'haftalik';

    return (
      <View style={styles.placeholderRoot}>
        <View style={styles.placeholderHeader}>
          <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.75}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backLabel}>Geri</Text>
          </TouchableOpacity>
          <Text style={styles.placeholderHeaderTitle} numberOfLines={1}>
            {selectedMeal.baslik || 'Detay'}
          </Text>
          <View style={styles.backButtonSpacer} />
        </View>

        <ScrollView
          style={styles.placeholderScroll}
          contentContainerStyle={styles.placeholderContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Tarih bilgisi */}
          <View style={styles.mealDetailInfoRow}>
            <Text style={styles.mealDetailInfoText}>
              📅 {selectedMeal.baslangicTarihi || '-'} – {selectedMeal.bitisTarihi || '-'}
            </Text>
            <View style={[styles.mealTipBadge, isHaftalik ? styles.mealTipHaftalik : styles.mealTipAylik]}>
              <Text style={[styles.mealTipText, isHaftalik ? styles.mealTipTextHaftalik : styles.mealTipTextAylik]}>
                {isHaftalik ? 'Haftalık' : 'Aylık'}
              </Text>
            </View>
          </View>

          {isHaftalik
            ? renderHaftalikDetay(selectedMeal)
            : renderAylikDetay(selectedMeal)}
        </ScrollView>
      </View>
    );
  }

  function renderHaftalikDetay(meal) {
    const ogunler = meal.ogunler || {};
    return (
      <>
        {GUNLER.map((gun) => {
          const gunData = ogunler[gun] || {};
          return (
            <View key={gun} style={styles.gunCard}>
              <View style={styles.gunCardHeader}>
                <Text style={styles.gunCardTitle}>{GUN_LABEL[gun] || gun}</Text>
              </View>
              {renderOgunRow('☀️', 'Kahvaltı', gunData.kahvalti)}
              {renderOgunRow('🍽️', 'Öğle', gunData.ogle)}
              {renderOgunRow('🍎', 'İkindi', gunData.ikindi)}
            </View>
          );
        })}
      </>
    );
  }

  function renderAylikDetay(meal) {
    const haftalar = meal.haftalar || {};
    const haftaKeys = Object.keys(haftalar).sort();

    if (haftaKeys.length === 0) {
      return (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Hafta verisi bulunamadı.</Text>
        </View>
      );
    }

    return (
      <>
        {haftaKeys.map((haftaKey) => {
          const hafta = haftalar[haftaKey] || {};
          const gunler = hafta.gunler || {};
          return (
            <View key={haftaKey} style={styles.haftaBlock}>
              <Text style={styles.haftaBaslik}>{hafta.baslik || haftaKey}</Text>
              {GUNLER.map((gun) => {
                const gunData = gunler[gun];
                if (!gunData) return null;
                return (
                  <View key={gun} style={styles.gunCard}>
                    <View style={styles.gunCardHeader}>
                      <Text style={styles.gunCardTitle}>{GUN_LABEL[gun] || gun}</Text>
                    </View>
                    {renderOgunRow('☀️', 'Kahvaltı', gunData.kahvalti)}
                    {renderOgunRow('🍽️', 'Öğle', gunData.ogle)}
                    {renderOgunRow('🍎', 'İkindi', gunData.ikindi)}
                  </View>
                );
              })}
            </View>
          );
        })}
      </>
    );
  }

  function renderOgunRow(icon, label, value) {
    return (
      <View style={styles.ogunRow}>
        <Text style={styles.ogunIcon}>{icon}</Text>
        <Text style={styles.ogunLabel}>{label}</Text>
        <Text style={styles.ogunValue}>{value || '-'}</Text>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PLACEHOLDER EKRANLAR (messages, gallery, documents)
  // ════════════════════════════════════════════════════════════

  function renderPlaceholderScreen(screenKey) {
    const config = PLACEHOLDER_SCREENS[screenKey];
    if (!config) return null;

    return (
      <View style={styles.placeholderRoot}>
        <View style={styles.placeholderHeader}>
          <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.75}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backLabel}>Geri</Text>
          </TouchableOpacity>
          <Text style={styles.placeholderHeaderTitle}>{config.title}</Text>
          <View style={styles.backButtonSpacer} />
        </View>

        <ScrollView
          style={styles.placeholderScroll}
          contentContainerStyle={styles.placeholderContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.placeholderCard}>
            <View style={[styles.placeholderIconWrapper, { backgroundColor: config.bgColor }]}>
              <Text style={styles.placeholderIcon}>{config.icon}</Text>
            </View>
            <Text style={styles.placeholderTitle}>{config.title}</Text>
            <Text style={styles.placeholderDesc}>{config.description}</Text>
            <View style={[styles.placeholderDivider, { backgroundColor: config.bgColor }]} />
            <View style={styles.comingSoonRow}>
              <View style={[styles.comingSoonDot, { backgroundColor: config.color }]} />
              <Text style={[styles.comingSoonText, { color: config.color }]}>Yakında aktif olacak</Text>
            </View>
          </View>

          <View style={styles.placeholderInfoCard}>
            <Text style={styles.placeholderInfoIcon}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeholderInfoTitle}>Bildirim alacaksınız</Text>
              <Text style={styles.placeholderInfoDesc}>
                Bu özellik hazır olduğunda size bildirim göndereceğiz.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.backHomeButton} onPress={goBack} activeOpacity={0.85}>
            <Text style={styles.backHomeButtonText}>← Ana Sayfaya Dön</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ANA EKRANLAR
  // ════════════════════════════════════════════════════════════

  function renderHome() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderTopHeader('Yumurcak', '🔔')}
        <Text style={styles.greeting}>Merhaba, {getParentName()} 👋</Text>
        <Text style={styles.greetingSub}>Bugünün özetini senin için hazırladık.</Text>
        {selectedChild ? renderChildHero() : renderEmptyChildCard()}
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <View style={styles.quickGrid}>
          {renderQuickAction('📋', 'Günlük Rapor', () => setActiveTab('reports'))}
          {renderQuickAction('📣', 'Duyurular', () => setActiveTab('announcements'))}
          {renderQuickAction('💬', 'Mesajlar', () => openScreen('messages'))}
          {renderQuickAction('🖼️', 'Galeri', () => openScreen('gallery'))}
          {renderQuickAction('🍽️', 'Yemek Listesi', () => openScreen('meals'))}
          {renderQuickAction('📁', 'Belgeler', () => openScreen('documents'))}
        </View>
      </ScrollView>
    );
  }

  function renderReports() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderTopHeader('Raporlar', '📅')}
        {!selectedChild ? renderEmptyChildCard() : null}
        {selectedChild && childReports.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>Henüz rapor yok</Text>
            <Text style={styles.emptyDesc}>Öğretmen günlük rapor girdiğinde burada görünecek.</Text>
          </View>
        ) : null}
        {selectedChild && childReports.map((item, index) => renderReportCard(item, index))}
      </ScrollView>
    );
  }

  function renderAnnouncements() {
    const visibleAnnouncements = announcements.slice(0, 10);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderTopHeader('Duyurular', '⚙️')}
        {visibleAnnouncements.length === 0 ? (
          <>
            {renderAnnouncementCard({
              baslik: 'Yaz Okulu Kayıtları Başladı',
              icerik: 'Yaz okulu kayıtlarımız başlamıştır. Detaylar için kurum yönetimiyle iletişime geçebilirsiniz.',
              tarih: 'Örnek Duyuru',
              onem: 'Normal',
            })}
            {renderAnnouncementCard({
              baslik: 'Yarın Piknik Etkinliğimiz Var!',
              icerik: 'Çocuklarımızın rahat kıyafetler giymesi ve yanında su matarası getirmesi rica olunur.',
              tarih: 'Örnek Duyuru',
              onem: 'Acil',
            })}
          </>
        ) : (
          visibleAnnouncements.map((item) => renderAnnouncementCard(item))
        )}
      </ScrollView>
    );
  }

  function renderProfile() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderTopHeader('Profil', '')}
        <View style={styles.profileHero}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>👧</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileChildName}>{getChildName()}</Text>
            <Text style={styles.profileChildSub}>{selectedChild?.yas || selectedChild?.dogumTarihi || 'Kreş öğrencisi'}</Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Veli Bilgileri</Text>
          {renderInfoRow('👤', 'Veli Adı', getParentName())}
          {renderInfoRow('☎️', 'Telefon', kullanici?.telefon || '-')}
          {renderInfoRow('✉️', 'Kullanıcı Adı', kullanici?.kullaniciAdi || '-')}
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Kurum Bilgileri</Text>
          {renderInfoRow('🏫', 'Sınıf', selectedChild?.sinifAdi || selectedChild?.sinifId || '-')}
          {renderInfoRow('👩‍🏫', 'Öğretmen', selectedChild?.ogretmenAdi || '-')}
          {renderInfoRow('🆘', 'Acil Durum', selectedChild?.acilDurumKisi || '-')}
        </View>
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>✏️ Bilgileri Güncelle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>↩ Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ════════════════════════════════════════════════════════════
  // YARDIMCI RENDER FONKSİYONLARI
  // ════════════════════════════════════════════════════════════

  function renderTopHeader(title, rightIcon) {
    return (
      <View style={styles.topHeader}>
        <View style={styles.headerSpacer} />
        <Text style={styles.topTitle}>{title}</Text>
        <Text style={styles.headerIcon}>{rightIcon}</Text>
      </View>
    );
  }

  function renderChildHero() {
    return (
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👧</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{getChildName()}</Text>
            <Text style={styles.heroSub}>Bugünün özeti</Text>
          </View>
          <View style={styles.heartCircle}><Text style={styles.heartText}>♡</Text></View>
        </View>
        <View style={styles.summaryPanel}>
          {renderSummaryItem('😊', 'Ruh Hali', getMood(todayReport), THEME.orange)}
          {renderSummaryItem('🍴', 'Yemek', getMeal(todayReport), THEME.primary)}
          {renderSummaryItem('🌙', 'Uyku', getSleep(todayReport), THEME.blue)}
          {renderSummaryItem('☑️', 'Yoklama', getAttendance(), THEME.green)}
        </View>
      </View>
    );
  }

  function renderEmptyChildCard() {
    return (
      <View style={styles.emptyStateCard}>
        <Text style={styles.emptyIcon}>👧</Text>
        <Text style={styles.emptyTitle}>Sisteme kayıtlı çocuk bulunmuyor</Text>
        <Text style={styles.emptyDesc}>Yönetici panelinden çocuğa bu veli bağlanmalı.</Text>
        <TouchableOpacity style={styles.smallLogoutButton} onPress={handleLogout}>
          <Text style={styles.smallLogoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderSummaryItem(icon, label, value, color) {
    return (
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryIcon, { color }]}>{icon}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    );
  }

  function renderQuickAction(icon, label, onPress) {
    return (
      <TouchableOpacity
        key={label}
        style={styles.quickAction}
        activeOpacity={onPress ? 0.8 : 1}
        onPress={onPress || undefined}
      >
        <Text style={styles.quickIcon}>{icon}</Text>
        <Text style={styles.quickLabel}>{label}</Text>
      </TouchableOpacity>
    );
  }

  function renderReportCard(item, index) {
    const isToday = index === 0;
    return (
      <View key={item.id} style={styles.timelineRow}>
        <View style={styles.timelineRail}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineLine} />
        </View>
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <View>
              <Text style={styles.reportDay}>{isToday ? 'Bugün' : item.tarih || 'Rapor'}</Text>
              <Text style={styles.reportDate}>{item.tarih || '-'}</Text>
            </View>
            {isToday ? <Text style={styles.todayBadge}>Bugün</Text> : null}
          </View>
          <View style={styles.reportSummaryRow}>
            {renderMiniMetric('😊', getMood(item))}
            {renderMiniMetric('🍴', getMeal(item))}
            {renderMiniMetric('🌙', getSleep(item))}
            {renderMiniMetric('✅', 'Geldi')}
          </View>
          <View style={styles.teacherNoteBox}>
            <Text style={styles.teacherAvatar}>👩‍🏫</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.teacherNoteTitle}>Öğretmen Notu</Text>
              <Text style={styles.teacherNote}>{getTeacherNote(item)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  function renderMiniMetric(icon, value) {
    return (
      <View style={styles.miniMetric}>
        <Text style={styles.miniIcon}>{icon}</Text>
        <Text style={styles.miniValue}>{value}</Text>
      </View>
    );
  }

  function renderAnnouncementCard(item) {
    const isUrgent = item.onem === 'Acil' || item.acil === true || item.tip === 'acil';
    return (
      <View key={item.id || item.baslik} style={styles.announcementCard}>
        <View style={styles.announcementTop}>
          <Text style={[styles.announcementBadge, isUrgent && styles.announcementBadgeUrgent]}>Yeni Duyuru</Text>
          <Text style={[styles.importanceBadge, isUrgent && styles.importanceBadgeUrgent]}>{isUrgent ? 'Acil' : 'Normal'}</Text>
        </View>
        <Text style={styles.announcementTitle}>{item.baslik || item.title || 'Duyuru'}</Text>
        <Text style={styles.announcementBody}>{item.icerik || item.metin || item.aciklama || 'Duyuru içeriği burada görünecek.'}</Text>
        <View style={styles.announcementFooter}>
          <Text style={styles.announcementDate}>📅 {item.tarih || 'Bugün'}</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </View>
    );
  }

  function renderInfoRow(icon, label, value) {
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoIcon}>{icon}</Text>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    );
  }

  function renderTabBar() {
    return (
      <View style={styles.tabBar}>
        {renderTab('home', '⌂', 'Ana Sayfa')}
        {renderTab('reports', '▥', 'Raporlar')}
        {renderTab('announcements', '🔔', 'Duyurular')}
        {renderTab('profile', '♙', 'Profil')}
      </View>
    );
  }

  function renderTab(key, icon, label) {
    const active = activeTab === key;
    return (
      <TouchableOpacity key={key} style={styles.tabItem} onPress={() => setActiveTab(key)} activeOpacity={0.8}>
        <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }
}

// ════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  appShell: { flex: 1, backgroundColor: THEME.bg },
  screen: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 108 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 12, color: THEME.muted, fontWeight: '600' },

  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerSpacer: { width: 34 },
  topTitle: { color: THEME.primary, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  headerIcon: { width: 34, textAlign: 'right', fontSize: 20 },

  greeting: { fontSize: 20, fontWeight: '900', color: THEME.text, marginBottom: 4 },
  greetingSub: { fontSize: 13, color: THEME.muted, marginBottom: 18 },

  heroCard: {
    backgroundColor: THEME.primary,
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    shadowColor: THEME.primary,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    marginRight: 14, borderWidth: 3, borderColor: 'rgba(255,255,255,0.65)',
  },
  avatarLarge: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    marginRight: 14, borderWidth: 3, borderColor: 'rgba(255,255,255,0.75)',
  },
  avatarText: { fontSize: 36 },
  heroName: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.86)', fontSize: 14, marginTop: 4, fontWeight: '600' },
  heartCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  heartText: { color: THEME.primary, fontSize: 25, fontWeight: '900' },

  summaryPanel: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 14, flexDirection: 'row' },
  summaryItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: THEME.border },
  summaryIcon: { fontSize: 22, marginBottom: 5 },
  summaryLabel: { fontSize: 11, color: THEME.text, fontWeight: '800' },
  summaryValue: { fontSize: 11, color: THEME.green, fontWeight: '900', marginTop: 4, textAlign: 'center' },

  sectionTitle: { fontSize: 17, fontWeight: '900', color: THEME.text, marginBottom: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickAction: {
    width: '31.5%', aspectRatio: 1, backgroundColor: THEME.card, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: THEME.border,
  },
  quickIcon: { fontSize: 30, marginBottom: 10 },
  quickLabel: { fontSize: 12, fontWeight: '900', color: THEME.text, textAlign: 'center' },

  emptyStateCard: {
    backgroundColor: THEME.card, borderRadius: 24, padding: 24, alignItems: 'center',
    marginTop: 24, borderWidth: 1, borderColor: THEME.border,
  },
  emptyIcon: { fontSize: 42, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: THEME.muted, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  smallLogoutButton: { marginTop: 18, backgroundColor: THEME.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18 },
  smallLogoutText: { color: '#FFFFFF', fontWeight: '900' },

  timelineRow: { flexDirection: 'row', marginBottom: 16 },
  timelineRail: { width: 28, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: THEME.primary, marginTop: 20 },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#DED2FF', marginTop: 4 },
  reportCard: {
    flex: 1, backgroundColor: THEME.card, borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: THEME.border, shadowColor: '#000',
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  reportDay: { fontSize: 16, fontWeight: '900', color: THEME.text },
  reportDate: { fontSize: 12, color: THEME.muted, marginTop: 2 },
  todayBadge: { backgroundColor: THEME.primarySoft, color: THEME.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: '900', overflow: 'hidden' },
  reportSummaryRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: THEME.border, paddingVertical: 12, marginBottom: 12 },
  miniMetric: { flex: 1, alignItems: 'center' },
  miniIcon: { fontSize: 22, marginBottom: 4 },
  miniValue: { fontSize: 11, color: THEME.text, fontWeight: '700', textAlign: 'center' },
  teacherNoteBox: { flexDirection: 'row', alignItems: 'flex-start' },
  teacherAvatar: { fontSize: 28, marginRight: 9 },
  teacherNoteTitle: { fontSize: 12, color: THEME.muted, fontWeight: '900' },
  teacherNote: { fontSize: 12, color: THEME.text, marginTop: 3, lineHeight: 17 },

  announcementCard: {
    backgroundColor: THEME.card, borderRadius: 22, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: THEME.border, shadowColor: '#000',
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  announcementTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  announcementBadge: { backgroundColor: THEME.primary, color: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: '900', overflow: 'hidden' },
  announcementBadgeUrgent: { backgroundColor: '#FF5A1F' },
  importanceBadge: { backgroundColor: '#F0EEF7', color: THEME.muted, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: '900', overflow: 'hidden' },
  importanceBadgeUrgent: { backgroundColor: '#FFE5EB', color: THEME.red },
  announcementTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 9 },
  announcementBody: { fontSize: 14, color: THEME.text, lineHeight: 21 },
  announcementFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  announcementDate: { fontSize: 12, color: THEME.muted, fontWeight: '700' },
  chevron: { fontSize: 30, color: THEME.muted },

  profileHero: {
    backgroundColor: THEME.primary, borderRadius: 24, padding: 18,
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
  },
  profileChildName: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  profileChildSub: { color: 'rgba(255,255,255,0.86)', marginTop: 4, fontWeight: '700' },
  infoCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: THEME.border },
  infoTitle: { fontSize: 16, color: THEME.text, fontWeight: '900', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  infoIcon: { width: 28, fontSize: 16 },
  infoLabel: { flex: 1, color: THEME.muted, fontSize: 13, fontWeight: '700' },
  infoValue: { flex: 1.2, color: THEME.text, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  primaryButton: { backgroundColor: THEME.primary, borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#D9CCFF' },
  secondaryButtonText: { color: THEME.primary, fontSize: 15, fontWeight: '900' },

  tabBar: {
    position: 'absolute', left: 14, right: 14, bottom: 14, height: 72,
    backgroundColor: '#FFFFFF', borderRadius: 26, flexDirection: 'row',
    justifyContent: 'space-around', alignItems: 'center',
    borderWidth: 1, borderColor: THEME.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 22, color: THEME.muted, marginBottom: 4 },
  tabIconActive: { color: THEME.primary },
  tabLabel: { fontSize: 10, color: THEME.muted, fontWeight: '800' },
  tabLabelActive: { color: THEME.primary, fontWeight: '900' },

  // ─── PLACEHOLDER STİLLERİ ─────────────────────────────────────
  placeholderRoot: { flex: 1, backgroundColor: THEME.bg },
  placeholderHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14,
    backgroundColor: THEME.card, borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingRight: 8 },
  backArrow: { fontSize: 28, color: THEME.primary, fontWeight: '700', lineHeight: 32, marginRight: 2 },
  backLabel: { fontSize: 15, color: THEME.primary, fontWeight: '800' },
  backButtonSpacer: { width: 60 },
  placeholderHeaderTitle: { fontSize: 18, fontWeight: '900', color: THEME.text, textAlign: 'center', flex: 1 },
  placeholderScroll: { flex: 1 },
  placeholderContent: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 48 },
  placeholderCard: {
    backgroundColor: THEME.card, borderRadius: 28, padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: THEME.border,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, elevation: 3, marginBottom: 16,
  },
  placeholderIconWrapper: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  placeholderIcon: { fontSize: 46 },
  placeholderTitle: { fontSize: 22, fontWeight: '900', color: THEME.text, marginBottom: 10 },
  placeholderDesc: { fontSize: 15, color: THEME.muted, textAlign: 'center', lineHeight: 22 },
  placeholderDivider: { width: '100%', height: 1, marginVertical: 20, borderRadius: 1 },
  comingSoonRow: { flexDirection: 'row', alignItems: 'center' },
  comingSoonDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  comingSoonText: { fontSize: 13, fontWeight: '800' },
  placeholderInfoCard: {
    backgroundColor: THEME.card, borderRadius: 20, padding: 18,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: THEME.border, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  placeholderInfoIcon: { fontSize: 28, marginRight: 14 },
  placeholderInfoTitle: { fontSize: 14, fontWeight: '900', color: THEME.text, marginBottom: 4 },
  placeholderInfoDesc: { fontSize: 13, color: THEME.muted, lineHeight: 19 },
  backHomeButton: { backgroundColor: THEME.primary, borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  backHomeButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },

  // ─── YEMEK LİSTESİ STİLLERİ ──────────────────────────────────
  mealCard: {
    backgroundColor: THEME.card, borderRadius: 22, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: THEME.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  mealCardTop: { marginBottom: 10 },
  mealTipBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  mealTipHaftalik: { backgroundColor: THEME.primarySoft },
  mealTipAylik: { backgroundColor: '#E8F9EF' },
  mealTipText: { fontSize: 12, fontWeight: '900' },
  mealTipTextHaftalik: { color: THEME.primary },
  mealTipTextAylik: { color: THEME.green },
  mealCardTitle: { fontSize: 17, fontWeight: '900', color: THEME.text, marginBottom: 6 },
  mealCardDate: { fontSize: 13, color: THEME.muted, fontWeight: '700', marginBottom: 14 },
  mealDetailButton: {
    backgroundColor: THEME.primary, borderRadius: 14, paddingVertical: 11, alignItems: 'center',
  },
  mealDetailButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },

  mealDetailInfoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 18,
  },
  mealDetailInfoText: { fontSize: 13, color: THEME.muted, fontWeight: '700', flex: 1, marginRight: 8 },

  haftaBlock: { marginBottom: 8 },
  haftaBaslik: {
    fontSize: 16, fontWeight: '900', color: THEME.primary,
    marginBottom: 10, marginTop: 6,
  },
  gunCard: {
    backgroundColor: THEME.card, borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: THEME.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  gunCardHeader: {
    borderBottomWidth: 1, borderBottomColor: THEME.border, paddingBottom: 8, marginBottom: 10,
  },
  gunCardTitle: { fontSize: 15, fontWeight: '900', color: THEME.text },
  ogunRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  ogunIcon: { fontSize: 16, width: 24 },
  ogunLabel: { fontSize: 12, fontWeight: '800', color: THEME.muted, width: 60 },
  ogunValue: { fontSize: 13, color: THEME.text, flex: 1, lineHeight: 18 },
});
