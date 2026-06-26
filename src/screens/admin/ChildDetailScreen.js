// ============================================================
// YUMURCAK — ChildDetailScreen.js
// Çocuk detay ekranı — veli, sınıf, öğretmen bilgileri
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { calculateChildAge, formatChildBirthDate, getChildBirthDate } from '../../utils/childDates';

export default function ChildDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { childId } = route.params;

  const [cocuk, setCocuk] = useState(null);
  const [sinif, setSinif] = useState(null);
  const [veliler, setVeliler] = useState([]);
  const [ogretmen, setOgretmen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cocukData = null;
    let siniflar = {};
    let kullanicilar = {};
    let cocukLoaded = false;
    let sinifLoaded = false;
    let kulLoaded = false;

    function buildDetail() {
      if (!cocukLoaded || !sinifLoaded || !kulLoaded) return;
      if (!cocukData) { setLoading(false); return; }

      // Sınıf
      const s = cocukData.sinifId ? siniflar[cocukData.sinifId] : null;
      setSinif(s ? { id: cocukData.sinifId, ...s } : null);

      // Veliler
      const veliList = (cocukData.veliIds || [])
        .filter((vid) => kullanicilar[vid])
        .map((vid) => {
          const v = kullanicilar[vid];
          return {
            id: vid,
            ad: `${v.ad || ''} ${v.soyad || ''}`.trim() || v.kullaniciAdi || vid,
            kullaniciAdi: v.kullaniciAdi || '-',
            telefon: v.telefon || null,
          };
        });
      setVeliler(veliList);

      // Öğretmen
      if (s && s.ogretmenIds && s.ogretmenIds.length > 0) {
        const ogId = s.ogretmenIds[0];
        const og = kullanicilar[ogId];
        if (og) {
          setOgretmen({
            id: ogId,
            ad: `${og.ad || ''} ${og.soyad || ''}`.trim() || og.kullaniciAdi || ogId,
            kullaniciAdi: og.kullaniciAdi || '-',
          });
        }
      }

      const birthDate = getChildBirthDate(cocukData);
      const formattedBirthDate = formatChildBirthDate(birthDate);
      const age = calculateChildAge(birthDate);

      setCocuk({
        id: childId,
        ad: `${cocukData.ad || ''} ${cocukData.soyad || ''}`.trim() || cocukData.ad || childId,
        dogumTarihi: birthDate || null,
        dogumTarihiText: formattedBirthDate,
        yasText: age,
        sinifId: cocukData.sinifId || null,
      });

      setLoading(false);
    }

    const cocukUnsub = onValue(ref(database, `cocuklar/${childId}`), (snap) => {
      cocukData = snap.val();
      cocukLoaded = true;
      buildDetail();
    });

    const sinifUnsub = onValue(ref(database, 'siniflar'), (snap) => {
      siniflar = snap.val() || {};
      sinifLoaded = true;
      buildDetail();
    });

    const kulUnsub = onValue(ref(database, 'kullanicilar'), (snap) => {
      kullanicilar = snap.val() || {};
      kulLoaded = true;
      buildDetail();
    });

    return () => {
      cocukUnsub();
      sinifUnsub();
      kulUnsub();
    };
  }, [childId]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#712B13" />
      </View>
    );
  }

  if (!cocuk) {
    return (
      <View style={s.center}>
        <Text style={s.bosYazi}>Çocuk bulunamadı.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.screen} contentContainerStyle={s.content}>

        {/* ── Başlık Kartı ── */}
        <View style={s.baslikKart}>
          <View style={s.avatarDaire}>
            <Text style={s.avatarEmoji}>👶</Text>
          </View>
          <Text style={s.cocukAd}>{cocuk.ad}</Text>
          {cocuk.dogumTarihi ? (
            <Text style={s.dogumTarihi}>🎂 {cocuk.dogumTarihiText}{cocuk.yasText ? ` • ${cocuk.yasText}` : ''}</Text>
          ) : null}
        </View>

        {/* ── Sınıf Bilgisi ── */}
        <View style={s.bolum}>
          <Text style={s.bolumBaslik}>Sınıf Bilgisi</Text>
          <View style={s.bilgiKart}>
            {sinif ? (
              <>
                <BilgiSatir etiket="Sınıf Adı" deger={sinif.ad} />
                {sinif.yasGrubu ? (
                  <BilgiSatir etiket="Yaş Grubu" deger={sinif.yasGrubu} />
                ) : null}
                <BilgiSatir etiket="Doğum Tarihi" deger={cocuk.dogumTarihiText || 'Belirtilmemiş'} />
                <BilgiSatir etiket="Yaş" deger={cocuk.yasText || '-'} />
              </>
            ) : (
              <Text style={s.bosInfo}>Sınıf atanmamış</Text>
            )}
          </View>
        </View>

        {/* ── Öğretmen Bilgisi ── */}
        <View style={s.bolum}>
          <Text style={s.bolumBaslik}>Öğretmen</Text>
          <View style={s.bilgiKart}>
            {ogretmen ? (
              <>
                <BilgiSatir etiket="Ad Soyad" deger={ogretmen.ad} />
                <BilgiSatir etiket="Kullanıcı Adı" deger={`@${ogretmen.kullaniciAdi}`} />
              </>
            ) : (
              <Text style={s.bosInfo}>Öğretmen atanmamış</Text>
            )}
          </View>
        </View>

        {/* ── Veli Bilgileri ── */}
        <View style={s.bolum}>
          <Text style={s.bolumBaslik}>Veliler</Text>
          {veliler.length === 0 ? (
            <View style={s.bilgiKart}>
              <Text style={s.bosInfo}>Veli bağlı değil</Text>
            </View>
          ) : (
            veliler.map((v) => (
              <View key={v.id} style={[s.bilgiKart, { marginBottom: 10 }]}>
                <BilgiSatir etiket="Ad Soyad" deger={v.ad} />
                <BilgiSatir etiket="Kullanıcı Adı" deger={`@${v.kullaniciAdi}`} />
                <BilgiSatir etiket="Telefon" deger={v.telefon ?? '-'} />
              </View>
            ))
          )}
        </View>

        {/* ── Düzenle Butonu ── */}
        <TouchableOpacity
          style={s.duzenleBtn}
          onPress={() => navigation.navigate('ChildForm', { childId: cocuk.id })}
          activeOpacity={0.85}
        >
          <Text style={s.duzenleBtnYazi}>✏️  Çocuğu Düzenle</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function BilgiSatir({ etiket, deger }) {
  return (
    <View style={s.bilgiSatir}>
      <Text style={s.etiket}>{etiket}</Text>
      <Text style={s.deger}>{deger}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  screen: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bosYazi: { color: '#888', fontSize: 16 },

  // Başlık
  baslikKart: {
    backgroundColor: '#712B13', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 20,
  },
  avatarDaire: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarEmoji: { fontSize: 32 },
  cocukAd: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  dogumTarihi: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  // Bölümler
  bolum: { marginBottom: 16 },
  bolumBaslik: { fontSize: 14, fontWeight: '800', color: '#712B13', marginBottom: 8, marginLeft: 2 },
  bilgiKart: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    elevation: 2,
  },
  bilgiSatir: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  etiket: { fontSize: 13, color: '#888', fontWeight: '600' },
  deger: { fontSize: 13, color: '#191A23', fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  bosInfo: { fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 6 },

  // Düzenle butonu
  duzenleBtn: {
    backgroundColor: '#712B13', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  duzenleBtnYazi: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
