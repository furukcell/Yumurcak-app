// ============================================================
// YUMURCAK — ChildDetailScreen.js
// FAZ 19: Sadece ilgili sınıf ve kullanıcı kayıtları tekil çekilir
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../../config/firebase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { calculateChildAge, formatChildBirthDate, getChildBirthDate } from '../../utils/childDates';

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

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
    const cocukUnsub = onValue(ref(database, `cocuklar/${childId}`), async (snap) => {
      const cocukData = snap.val();

      if (!cocukData) {
        setCocuk(null);
        setLoading(false);
        return;
      }

      try {
        // ── Sınıf (varsa) ────────────────────────────────────
        let s = null;
        if (cocukData.sinifId) {
          const sinifSnap = await get(ref(database, `siniflar/${cocukData.sinifId}`));
          if (sinifSnap.exists()) {
            s = { id: cocukData.sinifId, ...sinifSnap.val() };
          }
        }
        setSinif(s);

        // ── Veliler ──────────────────────────────────────────
        const veliIds = asArray(cocukData.veliIds);
        const veliResults = await Promise.all(
          veliIds.map((vid) =>
            get(ref(database, `kullanicilar/${vid}`)).then((vSnap) =>
              vSnap.exists() ? { id: vid, ...vSnap.val() } : null
            )
          )
        );
        const veliList = veliResults
          .filter(Boolean)
          .map((v) => ({
            id: v.id,
            ad: `${v.ad || ''} ${v.soyad || ''}`.trim() || v.kullaniciAdi || v.id,
            kullaniciAdi: v.kullaniciAdi || '-',
            telefon: v.telefon || null,
          }));
        setVeliler(veliList);

        // ── Öğretmen (sınıfın ilk öğretmeni) ─────────────────
        const ogretmenIds = s ? asArray(s.ogretmenIds) : [];
        if (ogretmenIds.length > 0) {
          const ogSnap = await get(ref(database, `kullanicilar/${ogretmenIds[0]}`));
          if (ogSnap.exists()) {
            const og = ogSnap.val();
            setOgretmen({
              id: ogretmenIds[0],
              ad: `${og.ad || ''} ${og.soyad || ''}`.trim() || og.kullaniciAdi || ogretmenIds[0],
              kullaniciAdi: og.kullaniciAdi || '-',
            });
          } else {
            setOgretmen(null);
          }
        } else {
          setOgretmen(null);
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
      } catch (error) {
        console.warn('Çocuk detay çekme hatası:', error);
        setLoading(false);
      }
    });

    return () => cocukUnsub();
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
