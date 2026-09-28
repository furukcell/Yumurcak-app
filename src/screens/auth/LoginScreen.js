// ============================================================
// YUMURCAK — LoginScreen.js
// FAZ 1: Yeni profesyonel giriş ekranı + keyboard düzeltmesi
// Firebase Auth + eski RTDB login fallback korunmuştur
// + Giriş ekranında dil seçici (ilk açılışta otomatik açılır)
// + Ekran metinleri i18n ('auth' namespace) üzerinden geliyor
// ============================================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { auth, database } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LANGUAGE_STORAGE_KEY } from '../../i18n';
import {
  usernameToEmail,
  findUserIdByAuthUid,
  getKresForUser,
  findLegacyUserByUsernameAndPassword,
} from '../../utils/authHelpers';

const LOGO = require('../../../icon.png');

const COLORS = {
  blue: '#0B5EAD',
  blue2: '#1E7BEF',
  orange: '#FF7A00',
  yellow: '#FFD33D',
  green: '#65C94A',
  bg: '#F4FBFF',
  card: '#FFFFFF',
  text: '#14324A',
  muted: '#7D8A99',
  border: '#D8E9FF',
  softBlue: '#EAF5FF',
  softGreen: '#EAF8E6',
  danger: '#FF7043',
};

const LANGUAGES = [
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
];

export default function LoginScreen({ navigation }) {
  const { girisYap } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();

  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [sifre, setSifre] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sifreGoster, setSifreGoster] = useState(false);

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [changingLang, setChangingLang] = useState(false);

  // İlk kurulumda (daha önce hiç dil seçilmemişse) çekmeceyi otomatik aç
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && !stored) {
          setLangMenuOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChangeLanguage = async (lng) => {
    if (lng === language || changingLang) {
      setLangMenuOpen(false);
      return;
    }
    setChangingLang(true);
    try {
      const { restartNeeded } = await changeLanguage(lng);
      setLangMenuOpen(false);

      if (restartNeeded) {
        Alert.alert(
          t('auth.restartRequiredTitle'),
          t('auth.restartRequiredDesc'),
          [
            { text: t('auth.restartLater'), style: 'cancel' },
            {
              text: t('auth.restartNow'),
              onPress: async () => {
                try {
                  await Updates.reloadAsync();
                } catch (error) {
                  console.warn('Yeniden başlatma başarısız (muhtemelen dev ortamı):', error?.message || error);
                }
              },
            },
          ]
        );
      }
    } finally {
      setChangingLang(false);
    }
  };

  const girisYapHandler = async () => {
    if (!kullaniciAdi.trim() || !sifre.trim()) {
      Alert.alert(t('auth.missingInfoTitle'), t('auth.missingInfoDesc'));
      return;
    }

    setYukleniyor(true);

    try {
      const email = usernameToEmail(kullaniciAdi);
      const authResult = await signInWithEmailAndPassword(auth, email, sifre.trim());

      const authUid = authResult.user.uid;
      const legacyUserId = await findUserIdByAuthUid(authUid);

      if (!legacyUserId) {
        Alert.alert(t('auth.accountMismatchTitle'), t('auth.accountMismatchDesc'));
        return;
      }

      const userSnap = await get(ref(database, `kullanicilar/${legacyUserId}`));
      if (!userSnap.exists()) {
        Alert.alert(t('auth.errorTitle'), t('auth.userRecordNotFound'));
        return;
      }

      const userData = {
        uid: legacyUserId,
        id: legacyUserId,
        authUid,
        email: authResult.user.email,
        ...userSnap.val(),
      };

      if (userData.aktif === false) {
        Alert.alert(t('auth.errorTitle'), t('auth.userInactive'));
        return;
      }

      const kresObj = await getKresForUser(userData);
      await girisYap(userData, kresObj);
    } catch (authError) {
      try {
        const legacyResult = await findLegacyUserByUsernameAndPassword(kullaniciAdi, sifre);

        if (legacyResult.status === 'not_found') {
          Alert.alert(t('auth.errorTitle'), t('auth.userNotFound'));
          return;
        }

        if (legacyResult.status === 'wrong_password') {
          Alert.alert(
            t('auth.errorTitle'),
            t('auth.wrongPassword', { fields: (legacyResult.fields || []).join(', ') })
          );
          return;
        }

        if (legacyResult.status === 'passive') {
          Alert.alert(t('auth.errorTitle'), t('auth.userInactive'));
          return;
        }

        const kullaniciObj = legacyResult.user;
        const kresObj = await getKresForUser(kullaniciObj);

        await girisYap(kullaniciObj, kresObj);

        Alert.alert(t('auth.infoTitle'), t('auth.legacyLoginInfo'));
      } catch (legacyError) {
        console.error('Login hata:', authError, legacyError);
        Alert.alert(t('auth.errorTitle'), t('auth.connectionError'));
      }
    } finally {
      setYukleniyor(false);
    }
  };

  const sifremiUnuttumHandler = () => {
    Alert.alert(t('auth.forgotPasswordTitle'), t('auth.forgotPasswordDesc'));
  };

  const activeLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <TouchableOpacity
          style={s.langButton}
          onPress={() => setLangMenuOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={s.langButtonText}>
            {activeLang.flag} {activeLang.code.toUpperCase()} ▾
          </Text>
        </TouchableOpacity>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollIc}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.bgCircleLeft} />
          <View style={s.bgCircleRight} />
          <Text style={s.starOne}>★</Text>
          <Text style={s.starTwo}>✦</Text>
          <Text style={s.dotOne}>●</Text>
          <Text style={s.dotTwo}>●</Text>

          <View style={s.logoAlan}>
            <Image source={LOGO} style={s.logo} resizeMode="contain" />

            <Text style={s.appName}>Yumurcak</Text>
            <Text style={s.appSubtitle}>{t('auth.appSubtitle')}</Text>

            <Text style={s.welcome}>{t('auth.welcome')}</Text>
            <Text style={s.description}>{t('auth.description')}</Text>
          </View>

          <View style={s.kart}>
            <View style={s.inputSarici}>
              <Text style={s.inputIkon}>👤</Text>
              <TextInput
                style={s.input}
                placeholder={t('auth.usernamePlaceholder')}
                value={kullaniciAdi}
                onChangeText={setKullaniciAdi}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <View style={s.inputSarici}>
              <Text style={s.inputIkon}>🔒</Text>
              <TextInput
                style={s.input}
                placeholder={t('auth.passwordPlaceholder')}
                value={sifre}
                onChangeText={setSifre}
                secureTextEntry={!sifreGoster}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="none"
                returnKeyType="done"
                onSubmitEditing={girisYapHandler}
                placeholderTextColor={COLORS.muted}
              />

              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setSifreGoster(!sifreGoster)}
                activeOpacity={0.7}
              >
                <Text style={s.eyeText}>{sifreGoster ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.btn, yukleniyor && s.btnDisabled]}
              onPress={girisYapHandler}
              disabled={yukleniyor}
              activeOpacity={0.85}
            >
              {yukleniyor ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.btnYazi}>{t('auth.loginButton')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={sifremiUnuttumHandler} activeOpacity={0.7}>
              <Text style={s.forgotText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.hillAlan}>
            <View style={s.hillOne} />
            <View style={s.hillTwo} />

            <View style={s.blocks}>
              <View style={s.blockRoof} />
              <View style={s.blockRow}>
                <View style={[s.block, s.blockGreen]} />
                <View style={[s.block, s.blockOrange]} />
                <View style={[s.block, s.blockBlue]} />
              </View>
            </View>
          </View>

          <View style={s.legalBox}>
            <View style={s.legalRow}>
              <TouchableOpacity
                style={s.legalItem}
                onPress={() => navigation.navigate('LegalDocuments', { docKey: 'kvkk' })}
                activeOpacity={0.7}
              >
                <Text style={s.legalIcon}>🛡️</Text>
                <Text style={s.legalText}>{t('auth.kvkkLink')}</Text>
              </TouchableOpacity>

              <View style={s.legalDivider} />

              <TouchableOpacity
                style={s.legalItem}
                onPress={() => navigation.navigate('LegalDocuments', { docKey: 'privacy' })}
                activeOpacity={0.7}
              >
                <Text style={s.legalIcon}>🔐</Text>
                <Text style={s.legalText}>{t('auth.privacyLink')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('LegalDocuments', { docKey: 'terms' })}
              activeOpacity={0.7}
            >
              <Text style={s.termsText}>{t('auth.termsLink')}</Text>
            </TouchableOpacity>

            <Text style={s.safeText}>🔒 {t('auth.safeText')}</Text>
            <Text style={s.versiyon}>{t('auth.version')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={langMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangMenuOpen(false)}
      >
        <TouchableOpacity
          style={s.langModalOverlay}
          activeOpacity={1}
          onPress={() => setLangMenuOpen(false)}
        >
          <View style={s.langModalSheet}>
            <Text style={s.langModalTitle}>{t('auth.languagePickerTitle')}</Text>

            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  s.langModalItem,
                  language === lang.code && s.langModalItemActive,
                ]}
                onPress={() => handleChangeLanguage(lang.code)}
                activeOpacity={0.85}
                disabled={changingLang}
              >
                <Text style={s.langModalItemFlag}>{lang.flag}</Text>
                <Text
                  style={[
                    s.langModalItemText,
                    language === lang.code && s.langModalItemTextActive,
                  ]}
                >
                  {lang.label}
                </Text>
                {language === lang.code && (
                  <Text style={s.langModalItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <Text style={s.langModalWarning}>{t('auth.languagePickerWarning')}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  scroll: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  scrollIc: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 18,
  },

  langButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 8 : 14,
    right: 16,
    zIndex: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  langButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },

  langModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,50,74,0.45)',
    justifyContent: 'flex-end',
  },

  langModalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },

  langModalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },

  langModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },

  langModalItemActive: {
    backgroundColor: COLORS.softBlue,
  },

  langModalItemFlag: {
    fontSize: 20,
    marginRight: 12,
  },

  langModalItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },

  langModalItemTextActive: {
    color: COLORS.blue,
  },

  langModalItemCheck: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.blue,
  },

  langModalWarning: {
    marginTop: 14,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 17,
  },

  bgCircleLeft: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#DFF1FF',
    opacity: 0.65,
    left: -70,
    top: 70,
  },

  bgCircleRight: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFF1D8',
    opacity: 0.8,
    right: -55,
    top: 230,
  },

  starOne: {
    position: 'absolute',
    left: 42,
    top: 165,
    color: COLORS.yellow,
    fontSize: 24,
  },

  starTwo: {
    position: 'absolute',
    right: 58,
    top: 250,
    color: '#8BBEF3',
    fontSize: 21,
  },

  dotOne: {
    position: 'absolute',
    left: 72,
    top: 235,
    color: '#8ED16F',
    fontSize: 16,
  },

  dotTwo: {
    position: 'absolute',
    right: 42,
    top: 178,
    color: COLORS.orange,
    fontSize: 18,
  },

  logoAlan: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 18,
  },

  logo: {
    width: 176,
    height: 176,
    marginBottom: 8,
  },

  appName: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.blue,
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  appSubtitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.orange,
    marginTop: 2,
    textAlign: 'center',
  },

  welcome: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 22,
    textAlign: 'center',
  },

  description: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.82,
    marginTop: 7,
    textAlign: 'center',
    lineHeight: 20,
  },

  kart: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 22,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#EDF5FF',
    shadowColor: '#0B5EAD',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },

  inputSarici: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1.6,
    borderColor: COLORS.border,
  },

  inputIkon: {
    fontSize: 20,
    marginRight: 12,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },

  eyeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  eyeText: {
    fontSize: 20,
  },

  btn: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: COLORS.blue2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },

  btnDisabled: {
    opacity: 0.7,
  },

  btnYazi: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  forgotText: {
    color: COLORS.blue2,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 18,
  },

  hillAlan: {
    height: 112,
    marginTop: 12,
    marginHorizontal: -22,
    overflow: 'hidden',
  },

  hillOne: {
    position: 'absolute',
    left: -80,
    right: -30,
    bottom: -48,
    height: 100,
    borderTopLeftRadius: 160,
    borderTopRightRadius: 160,
    backgroundColor: COLORS.softGreen,
  },

  hillTwo: {
    position: 'absolute',
    left: 130,
    right: -90,
    bottom: -58,
    height: 110,
    borderTopLeftRadius: 170,
    borderTopRightRadius: 170,
    backgroundColor: '#DFF3D8',
    opacity: 0.8,
  },

  blocks: {
    position: 'absolute',
    right: 24,
    bottom: 6,
    alignItems: 'center',
  },

  blockRoof: {
    width: 52,
    height: 36,
    backgroundColor: COLORS.yellow,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    transform: [{ rotate: '45deg' }],
    marginBottom: -10,
  },

  blockRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  block: {
    width: 34,
    height: 34,
    borderRadius: 8,
    marginHorizontal: 1,
  },

  blockGreen: {
    backgroundColor: COLORS.green,
  },

  blockOrange: {
    backgroundColor: COLORS.orange,
  },

  blockBlue: {
    backgroundColor: COLORS.blue2,
  },

  legalBox: {
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginHorizontal: -22,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderColor: '#EEF4FA',
  },

  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  legalItem: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  legalIcon: {
    fontSize: 16,
    marginRight: 6,
  },

  legalText: {
    color: COLORS.blue2,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  legalDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CAD6E2',
    marginHorizontal: 8,
  },

  termsText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },

  safeText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },

  versiyon: {
    color: '#A0A8B1',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
});
