// ============================================================
// YUMURCAK — ClassListScreen.js
// FAZ 2: Sınıf listesi profesyonel arayüz
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';

const THEME = {
  primary: '#0B5EAD',
  primarySoft: '#EAF5FF',
  orange: '#FF8A1F',
  orangeSoft: '#FFF3E6',
  green: '#28B463',
  greenSoft: '#EAF8EE',
  purple: '#7B4DFF',
  purpleSoft: '#F0EAFF',
  text: '#17324D',
  muted: '#728197',
  bg: '#F5FAFF',
  card: '#FFFFFF',
  border: '#E3EDF7',
};

export default function ClassListScreen() {
  const navigation = useNavigation();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const classesRef = ref(database, 'siniflar');
    const unsubscribe = onValue(classesRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        const classesArray = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));

        setClasses(classesArray);
      } else {
        setClasses([]);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toplamOgretmen = useMemo(() => {
    return classes.reduce((total, item) => total + (item.ogretmenIds?.length || 0), 0);
  }, [classes]);

  const renderItem = ({ item }) => {
    const teacherCount = item.ogretmenIds?.length || 0;
    const studentCount = item.ogrenciSayisi || item.cocukSayisi || item.studentCount || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ClassForm', { classId: item.id })}
        activeOpacity={0.85}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>🏫</Text>
          </View>

          <View style={styles.classMainInfo}>
            <Text style={styles.className} numberOfLines={1} ellipsizeMode="tail">
              {item.ad || 'İsimsiz Sınıf'}
            </Text>
            <Text style={styles.classSubText} numberOfLines={1} ellipsizeMode="tail">
              {item.yasGrubu || 'Yaş grubu belirtilmemiş'}
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={[styles.infoPill, styles.teacherPill]}>
            <Text style={styles.infoEmoji}>👩‍🏫</Text>
            <Text style={styles.infoText}>{teacherCount} Öğretmen</Text>
          </View>

          <View style={[styles.infoPill, styles.studentPill]}>
            <Text style={styles.infoEmoji}>👶</Text>
            <Text style={styles.infoText}>{studentCount} Çocuk</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Sınıflar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={classes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={classes.length === 0 ? styles.emptyListContent : styles.listContent}
          ListHeaderComponent={
            <View style={styles.headerCard}>
              <View style={styles.headerTopRow}>
                <View>
                  <Text style={styles.screenTitle}>Sınıflar</Text>
                  <Text style={styles.screenSubtitle}>Kurumdaki sınıfları ve öğretmen eşleşmelerini yönetin.</Text>
                </View>

                <TouchableOpacity
                  style={styles.headerAddButton}
                  onPress={() => navigation.navigate('ClassForm')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.headerAddText}>+ Ekle</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{classes.length}</Text>
                  <Text style={styles.summaryLabel}>Sınıf</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{toplamOgretmen}</Text>
                  <Text style={styles.summaryLabel}>Öğretmen Ataması</Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏫</Text>
              <Text style={styles.emptyText}>Henüz sınıf eklenmemiş</Text>
              <Text style={styles.emptySubtext}>İlk sınıfı ekleyerek çocuk ve öğretmen yönetimini başlat.</Text>

              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('ClassForm')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyButtonText}>+ Sınıf Ekle</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {classes.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('ClassForm')}
            activeOpacity={0.85}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
  },

  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bg,
  },

  loadingText: {
    color: THEME.muted,
    fontWeight: '800',
    marginTop: 12,
  },

  listContent: {
    padding: 18,
    paddingBottom: 96,
  },

  emptyListContent: {
    flexGrow: 1,
    padding: 18,
    paddingBottom: 40,
  },

  headerCard: {
    backgroundColor: THEME.card,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#0B5EAD',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 5,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.text,
  },

  screenSubtitle: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
    maxWidth: 220,
  },

  headerAddButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    flexShrink: 0,
  },

  headerAddText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: THEME.primarySoft,
    borderRadius: 20,
    paddingVertical: 14,
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryNumber: {
    color: THEME.primary,
    fontSize: 24,
    fontWeight: '900',
  },

  summaryLabel: {
    color: THEME.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },

  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#CFE2F6',
  },

  card: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#17324D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  iconText: {
    fontSize: 26,
  },

  classMainInfo: {
    flex: 1,
    minWidth: 0,
  },

  className: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.text,
  },

  classSubText: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },

  arrow: {
    color: THEME.primary,
    fontSize: 32,
    fontWeight: '900',
    marginLeft: 8,
  },

  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },

  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  teacherPill: {
    backgroundColor: THEME.purpleSoft,
  },

  studentPill: {
    backgroundColor: THEME.greenSoft,
  },

  infoEmoji: {
    fontSize: 14,
    marginRight: 5,
  },

  infoText: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: '800',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 34,
  },

  emptyIcon: {
    fontSize: 56,
    marginBottom: 14,
  },

  emptyText: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.text,
    textAlign: 'center',
  },

  emptySubtext: {
    fontSize: 14,
    color: THEME.muted,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },

  emptyButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 18,
    marginTop: 20,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 22,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 13,
    elevation: 7,
  },

  fabText: {
    fontSize: 34,
    color: '#FFFFFF',
    fontWeight: '500',
    lineHeight: 36,
  },
});
