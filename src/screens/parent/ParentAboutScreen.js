import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenShell, styles } from './parentShared';

export default function ParentAboutScreen({ navigation }) {
  const { t } = useTranslation();
  return (
    <ScreenShell title={t('parent.about.title')} emoji="🌈" navigation={navigation}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌈 {t('parent.about.whatIsTitle')}</Text>
        <Text style={styles.cardText}>
          {t('parent.about.whatIsPara1')}
        </Text>
        <Text style={styles.cardText}>
          {t('parent.about.whatIsPara2')}
        </Text>
        <Text style={styles.cardText}>
          {t('parent.about.whatIsPara3')}
        </Text>
        <Text style={styles.cardText}>
          {t('parent.about.whatIsPara4')}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💜 {t('parent.about.approachTitle')}</Text>
        <Text style={styles.cardText}>
          {t('parent.about.approachPara1')}
        </Text>
        <Text style={styles.cardText}>
          {t('parent.about.approachPara2')}
        </Text>
        <Text style={styles.cardText}>
          {t('parent.about.approachPara3')}
        </Text>
      </View>
    </ScreenShell>
  );
}
