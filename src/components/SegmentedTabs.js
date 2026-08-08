// ============================================================
// YUMURCAK — SegmentedTabs.js
// Medikal ekranında "Alerjiler" / "İlaç Takip" gibi 2 (veya daha fazla)
// sekme arasında geçiş için basit, tema uyumlu segment kontrolü.
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function SegmentedTabs({ tabs, activeKey, onChange, accentColor = '#5D5FEF' }) {
  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, active && { backgroundColor: accentColor }]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.85}
          >
            {tab.icon ? <Text style={styles.icon}>{tab.icon}</Text> : null}
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            {tab.badge ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{tab.badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: '#F0F1F6', borderRadius: 16, padding: 4, gap: 4, marginBottom: 14 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 11, gap: 6 },
  icon: { fontSize: 15 },
  label: { fontWeight: '900', fontSize: 13, color: '#6B6F80' },
  labelActive: { color: '#fff' },
  badge: { backgroundColor: '#E2E3EC', borderRadius: 999, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#6B6F80' },
  badgeTextActive: { color: '#fff' },
});
