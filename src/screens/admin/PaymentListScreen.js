// ============================================================
// YUMURCAK — PaymentListScreen.js
// FAZ 4: Admin ödeme ekranı profesyonel liste + filtreler
// ============================================================
import i18n from '../../i18n';
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { ref, onValue, update, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { formatDisplayMonth } from '../../utils/dateFormat';

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  green: '#20B45B',
  orange: '#FF9F1C',
  red: '#FF4D6D',
  blue: '#3A7BFF',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
};

const DURUM_META = {
    tum: { icon: '', color: THEME.primary, bg: THEME.primarySoft, labelKey: 'admin.paymentList.all' },
    odendi: { icon: '✅', color: THEME.green, bg: '#E8FBEF', labelKey: 'admin.paymentList.paid' },
    bekliyor: { icon: '⏳', color: THEME.orange, bg: '#FFF4E1', labelKey: 'admin.paymentList.pending' },
    gecikti: { icon: '❗', color: THEME.red, bg: '#FFE8EE', labelKey: 'admin.paymentList.late' },
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>{t('admin.paymentList.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerCard}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle}>{t('admin.paymentList.title')}</Text>
          <Text style={styles.headerSub}>{t('admin.paymentList.subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.headerAddBtn} onPress={() => navigation.navigate('PaymentForm')} activeOpacity={0.85}>
          <Text style={styles.headerAddText}>{t('admin.paymentList.add')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryBox title={t('admin.paymentList.openAmount')} value={formatMoney(stats.acikTutar)} color={THEME.red} />
        <SummaryBox title={t('admin.paymentList.thisMonth')} value={formatMoney(stats.buAyTutar)} color={THEME.primary} />
        <SummaryBox title={t('admin.paymentList.paid')} value={String(stats.odendi)} color={THEME.green} />
        <SummaryBox title={t('admin.paymentList.late')} value={String(stats.gecikti)} color={THEME.red} />
      </View>

      <View style={styles.filterRow}>
        {['tum', 'bekliyor', 'gecikti', 'odendi'].map((key) => {
          const meta = DURUM_META[key];
          const active = filter === key;
          return (
            <TouchableOpacity key={key} style={[styles.filterChip, active && { backgroundColor: meta.color, borderColor: meta.color }]} onPress={() => setFilter(key)} activeOpacity={0.8}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{t(meta.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      <View style={styles.container}>
        {filteredPayments.length === 0 ? (
          <View style={styles.bos}>
            <Text style={styles.bosEmoji}>💳</Text>
            <Text style={styles.bosYazi}>{t('admin.paymentList.empty')}</Text>
            <Text style={styles.bosAlt}>Yeni ödeme oluşturmak için {t('admin.paymentList.add')} butonuna bas</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => navigation.navigate('PaymentForm')} activeOpacity={0.85}>
              <Text style={styles.emptyAddText}>{t('admin.paymentList.create')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredPayments}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function SummaryBox({ title, value, color }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={[styles.summaryValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  loadingText: { marginTop: 10, color: THEME.muted, fontWeight: '700' },
  errorText: { backgroundColor: '#FFF1F3', color: THEME.red, fontWeight: '800', padding: 10, textAlign: 'center' },
  headerCard: { margin: 16, marginBottom: 10, backgroundColor: THEME.primary, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', shadowColor: THEME.primary, shadowOpacity: 0.18, shadowRadius: 14, elevation: 5 },
  headerTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '700', marginTop: 4 },
  headerAddBtn: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginLeft: 10 },
  headerAddText: { color: THEME.primary, fontWeight: '900', fontSize: 13 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
  summaryBox: { width: '48%', backgroundColor: THEME.card, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: THEME.border },
  summaryTitle: { color: THEME.muted, fontSize: 11, fontWeight: '800' },
  summaryValue: { marginTop: 5, fontSize: 18, fontWeight: '900' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterChip: { flex: 1, backgroundColor: THEME.card, borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  filterText: { color: THEME.text, fontWeight: '900', fontSize: 12 },
  filterTextActive: { color: '#FFFFFF' },
  list: { padding: 16, paddingTop: 8, paddingBottom: 110 },
  card: { backgroundColor: THEME.card, borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarCircle: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#FFF6E8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 22 },
  cardTextBlock: { flex: 1, minWidth: 0, paddingRight: 8 },
  cocukAd: { fontSize: 16, fontWeight: '900', color: THEME.text },
  baslik: { fontSize: 13, color: THEME.primary, fontWeight: '800', marginTop: 3 },
  donem: { fontSize: 12, color: THEME.muted, fontWeight: '700', marginTop: 3 },
  durumBadge: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5, maxWidth: 112 },
  durumYazi: { fontSize: 11, fontWeight: '900' },
  infoRow: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: THEME.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { color: THEME.muted, fontSize: 11, fontWeight: '800' },
  infoRight: { alignItems: 'flex-end', marginLeft: 10, maxWidth: 150 },
  tutar: { fontSize: 19, fontWeight: '900', color: THEME.text, marginTop: 3 },
  tarih: { fontSize: 12, color: THEME.text, fontWeight: '800', marginTop: 3 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editBtn: { flex: 1, backgroundColor: THEME.primarySoft, borderRadius: 13, paddingVertical: 11, alignItems: 'center' },
  editBtnText: { color: THEME.primary, fontSize: 13, fontWeight: '900' },
  odendiBtn: { flex: 1, backgroundColor: THEME.green, borderRadius: 13, paddingVertical: 11, alignItems: 'center' },
  odendiBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  bos: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 34 },
  bosEmoji: { fontSize: 50, marginBottom: 12 },
  bosYazi: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 6 },
  bosAlt: { fontSize: 13, color: THEME.muted, textAlign: 'center', fontWeight: '700', lineHeight: 19 },
  emptyAddBtn: { marginTop: 18, backgroundColor: THEME.primary, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 13 },
  emptyAddText: { color: '#FFFFFF', fontWeight: '900' },
});
