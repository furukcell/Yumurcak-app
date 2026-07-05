import React from 'react';
import { View, Text } from 'react-native';
import { ScreenShell, styles } from './parentShared';

export default function ParentAboutScreen({ navigation }) {
  return (
    <ScreenShell title="Hakkımızda" emoji="🌈" navigation={navigation}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌈 Yumurcak Nedir?</Text>
        <Text style={styles.cardText}>
          Yumurcak, kreşler ile veliler arasındaki günlük iletişimi kolaylaştırmak için geliştirilen modern bir kreş takip uygulamasıdır.
        </Text>
        <Text style={styles.cardText}>
          Veliler çocuklarının günlük raporlarını, yoklama durumunu, yemek listesini, galeri paylaşımlarını, duyuruları ve gelişim bilgilerini tek ekrandan takip edebilir.
        </Text>
        <Text style={styles.cardText}>
          Öğretmenler ve yöneticiler ise sınıf süreçlerini daha düzenli yönetir, velilere daha hızlı bilgi ulaştırır ve kurum içi iletişimi sadeleştirir.
        </Text>
        <Text style={styles.cardText}>
          Amacımız; çocukların gün içindeki gelişimini, mutluluğunu ve güvenliğini ailelere daha şeffaf, hızlı ve anlaşılır şekilde ulaştırmaktır.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💜 Bizim Yaklaşımımız</Text>
        <Text style={styles.cardText}>
          Yumurcak; kolay kullanılan, sıcak tasarımlı, gereksiz karmaşadan uzak ve kreşlerin gerçek ihtiyaçlarına göre gelişen bir platformdur.
        </Text>
      </View>
    </ScreenShell>
  );
}
