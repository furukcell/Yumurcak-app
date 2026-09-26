// ============================================================
// YUMURCAK — ChangePasswordCard.js
// Tüm roller (yönetici, öğretmen, veli, servisci) için ortak
// "kendi şifreni değiştir" kartı. Firebase Auth'ta şifre değişimi
// güvenlik gereği yeniden kimlik doğrulama (eski şifre) ister —
// bu zaten istenen "eski şifre + yeni şifre iki kere" akışıyla
// birebir örtüşüyor.
//
// ÖNEMLİ: AuthContext.js içindeki restoreFirebaseSession, oturumu
// geri açarken kullanicilar/{id}.sifre alanını okuyup Firebase Auth'a
// tekrar giriş yapıyor. Bu yüzden şifre değiştiğinde SADECE Firebase
// Auth'u değil, DB'deki 'sifre' kopyasını ve cihazdaki AsyncStorage
// önbelleğini de güncellememiz gerekiyor — yoksa bir sonraki uygulama
// açılışında otomatik oturum açma eski şifreyle denenip başarısız olur.
// ============================================================
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { ref as dbRef, update } from 'firebase/database';
import { auth, database } from '../config/firebase';

const USER_KEY = 'yumurcak_kullanici'; // AuthContext.js ile birebir aynı olmalı

export default function ChangePasswordCard({ userId, primaryColor = '#3C3489' }) {
  const { t } = useTranslation();
  const [eskiSifre, setEskiSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('');
  const [gosterEski, setGosterEski] = useState(false);
  const [gosterYeni, setGosterYeni] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    const errorTitle = t('components.changePasswordCard.errorTitle');
    if (!eskiSifre.trim() || !yeniSifre.trim() || !yeniSifreTekrar.trim()) {
      Alert.alert(errorTitle, t('components.changePasswordCard.fillAllFields'));
      return;
    }
    if (yeniSifre.trim().length < 6) {
      Alert.alert(errorTitle, t('components.changePasswordCard.passwordTooShort'));
      return;
    }
    if (yeniSifre.trim() !== yeniSifreTekrar.trim()) {
      Alert.alert(errorTitle, t('components.changePasswordCard.passwordsDontMatch'));
      return;
    }
    if (yeniSifre.trim() === eskiSifre.trim()) {
      Alert.alert(errorTitle, t('components.changePasswordCard.samePassword'));
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      Alert.alert(errorTitle, t('components.changePasswordCard.sessionNotFound'));
      return;
    }

    setSaving(true);
    try {
      // 1) Eski şifreyi doğrula (Firebase güvenlik gereği zorunlu)
      const credential = EmailAuthProvider.credential(currentUser.email, eskiSifre.trim());
      await reauthenticateWithCredential(currentUser, credential);

      // 2) Gerçek Firebase Auth şifresini güncelle
      await updatePassword(currentUser, yeniSifre.trim());

      // 3) DB'deki kopyayı güncelle (otomatik oturum açma bunu okuyor)
      if (userId) {
        await update(dbRef(database, `kullanicilar/${userId}`), {
          sifre: yeniSifre.trim(),
          sifreGuncellenmeTarihi: Date.now(),
          updatedAt: Date.now(),
        }).catch((err) => console.warn('Şifre DB güncellemesi başarısız:', err?.message || err));
      }

      // 4) Cihazdaki önbelleği güncelle (uygulama yeniden açıldığında kullanılıyor)
      try {
        const cached = await AsyncStorage.getItem(USER_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.sifre = yeniSifre.trim();
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(parsed));
        }
      } catch (cacheErr) {
        console.warn('Şifre önbellek güncellemesi başarısız:', cacheErr);
      }

      setEskiSifre('');
      setYeniSifre('');
      setYeniSifreTekrar('');
      Alert.alert(t('components.changePasswordCard.successTitle'), t('components.changePasswordCard.successMessage'));
    } catch (error) {
      console.error(error);
      if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        Alert.alert(errorTitle, t('components.changePasswordCard.wrongPassword'));
      } else if (error?.code === 'auth/too-many-requests') {
        Alert.alert(errorTitle, t('components.changePasswordCard.tooManyRequests'));
      } else if (error?.code === 'auth/requires-recent-login') {
        Alert.alert(errorTitle, t('components.changePasswordCard.requiresRecentLogin'));
      } else if (error?.code === 'auth/weak-password') {
        Alert.alert(errorTitle, t('components.changePasswordCard.weakPassword'));
      } else {
        Alert.alert(errorTitle, `${t('components.changePasswordCard.changeFailed')}\n\n${error?.message || ''}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.card}>
      <Text style={s.title}>{t('components.changePasswordCard.title')}</Text>
      <Text style={s.hint}>{t('components.changePasswordCard.hint')}</Text>

      <View style={s.field}>
        <Text style={s.label}>{t('components.changePasswordCard.oldPasswordLabel')}</Text>
        <View style={s.pwRow}>
          <TextInput
            style={s.pwInput}
            value={eskiSifre}
            onChangeText={setEskiSifre}
            secureTextEntry={!gosterEski}
            placeholder={t('components.changePasswordCard.oldPasswordPlaceholder')}
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={s.pwToggle} onPress={() => setGosterEski(!gosterEski)} activeOpacity={0.75}>
            <Text style={[s.pwToggleText, { color: primaryColor }]}>{gosterEski ? t('components.changePasswordCard.hide') : t('components.changePasswordCard.show')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{t('components.changePasswordCard.newPasswordLabel')}</Text>
        <View style={s.pwRow}>
          <TextInput
            style={s.pwInput}
            value={yeniSifre}
            onChangeText={setYeniSifre}
            secureTextEntry={!gosterYeni}
            placeholder={t('components.changePasswordCard.newPasswordPlaceholder')}
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={s.pwToggle} onPress={() => setGosterYeni(!gosterYeni)} activeOpacity={0.75}>
            <Text style={[s.pwToggleText, { color: primaryColor }]}>{gosterYeni ? t('components.changePasswordCard.hide') : t('components.changePasswordCard.show')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.label}>{t('components.changePasswordCard.newPasswordRepeatLabel')}</Text>
        <TextInput
          style={s.input}
          value={yeniSifreTekrar}
          onChangeText={setYeniSifreTekrar}
          secureTextEntry={!gosterYeni}
          placeholder={t('components.changePasswordCard.newPasswordRepeatPlaceholder')}
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={[s.button, { backgroundColor: primaryColor }, saving && s.buttonDisabled]}
        onPress={handleChange}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{t('components.changePasswordCard.submitButton')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 15, borderWidth: 1, borderColor: '#eee', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '900', color: '#222' },
  hint: { color: '#777', fontWeight: '600', marginTop: 4, marginBottom: 12, fontSize: 12, lineHeight: 17 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd', color: '#222' },
  pwRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', overflow: 'hidden' },
  pwInput: { flex: 1, minWidth: 0, padding: 12, fontSize: 15, color: '#222' },
  pwToggle: { paddingHorizontal: 12, alignSelf: 'stretch', justifyContent: 'center', backgroundColor: '#f5f5f5', borderLeftWidth: 1, borderLeftColor: '#ddd' },
  pwToggleText: { fontWeight: '700', fontSize: 12 },
  button: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '900' },
});
