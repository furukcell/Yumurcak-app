import React from 'react';
import { View, Text } from 'react-native';
import { ScreenShell, styles } from './parentShared';

export default function ParentAboutScreen({ navigation }) {
  return (
    <ScreenShell title="Hakkımızda" emoji="🌈" navigation={navigation}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌈 Yumurcak Nedir?</Text>
        <Text style={styles.cardText}>
          Yumurcak, kreşler ile veliler arasındaki iletişimi daha düzenli, hızlı ve şeffaf hale getirmek için geliştirilen bir kreş takip uygulamasıdır.
        </Text>
        <Text style={styles.cardText}>
          Veliler; çocuklarının günlük raporlarını, yoklama durumunu, yemek listesini, duyuruları, etkinlikleri, galeri paylaşımlarını ve gelişim bilgilerini tek bir yerden kolayca takip edebilir.
        </Text>
        <Text style={styles.cardText}>
          Öğretmenler ve yöneticiler ise sınıf süreçlerini daha pratik yönetir, velilere anlık bilgi ulaştırır ve kurum içi düzeni daha güçlü hale getirir.
        </Text>
        <Text style={styles.cardText}>
          Yumurcak’ın amacı; çocukların kreşte geçirdiği günü ailelere daha anlaşılır, güvenli ve sıcak bir şekilde ulaştırmaktır.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💜 Bizim Yaklaşımımız</Text>
        <Text style={styles.cardText}>
          Yumurcak; sade, anlaşılır ve kullanımı kolay bir deneyim sunmak için tasarlandı.
        </Text>
        <Text style={styles.cardText}>
          Amacımız karmaşık ekranlar oluşturmak değil; kreşlerin, öğretmenlerin ve velilerin gerçekten ihtiyaç duyduğu bilgileri en kolay şekilde ulaştırmak.
        </Text>
        <Text style={styles.cardText}>
          Her çocuğun günü değerlidir. Biz de bu günü ailelere daha düzenli, daha güvenilir ve daha içten bir şekilde aktarmayı hedefliyoruz.
        </Text>
      </View>
    </ScreenShell>
  );
}
