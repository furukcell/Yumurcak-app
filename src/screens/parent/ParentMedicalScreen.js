import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../../config/firebase';
import { ScreenShell, EmptyState, LoadingScreen, useParentBase, styles, THEME } from './parentShared';
import AppSuccessToast from '../../components/AppSuccessToast';

export default function ParentMedicalScreen({ navigation }) {
  const { loading, selectedChild, kresId, parentId } = useParentBase();
  const [medical, setMedical] = useState(null);
  const [draft, setDraft] = useState({ alerjiler: '', ilaclar: '', notlar: '' });
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (!selectedChild?.id) return undefined;

    const r = ref(database, `medikalBilgiler/${selectedChild.id}`);

    const unsub = onValue(r, (snap) => {
      const data = snap.val();

      setMedical(data);
      setDraft({
        alerjiler: data?.alerjiler || '',
        ilaclar: data?.ilaclar || '',
        notlar: data?.notlar || '',
      });
    });

    return () => unsub();
  }, [selectedChild?.id]);

  const saveMedical = async () => {
    if (!selectedChild?.id) return;

    setSaving(true);

    try {
      await set(ref(database, `medikalBilgiler/${selectedChild.id}`), {
        kresId: kresId || '',
        cocukId: selectedChild.id,
        alerjiler: draft.alerjiler || '',
        ilaclar: draft.ilaclar || '',
        notlar: draft.notlar || '',
        guncelleyenVeliId: parentId || '',
        updatedAt: Date.now(),
      });

      setSuccessToast(true);
    } catch (error) {
      Alert.alert('Hata', 'Medikal bilgiler kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen text="Medikal bilgiler hazırlanıyor..." />;

  return (
    <>
      <AppSuccessToast
        visible={successToast}
        message="Medikal bilgiler güncellendi"
        onHide={() => setSuccessToast(false)}
      />

      <ScreenShell title="Medikal Takip" emoji="🩺" navigation={navigation}>
        {!selectedChild ? (
          <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Medikal bilgi için çocuk bağlantısı gerekir." />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Alerjiler</Text>
              <TextInput
                style={local.input}
                value={draft.alerjiler}
                onChangeText={(text) => setDraft((p) => ({ ...p, alerjiler: text }))}
                placeholder="Örn: Süt alerjisi, polen..."
                multiline
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Kullandığı İlaçlar</Text>
              <TextInput
                style={local.input}
                value={draft.ilaclar}
                onChangeText={(text) => setDraft((p) => ({ ...p, ilaclar: text }))}
                placeholder="Örn: Şurup, inhaler..."
                multiline
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Notlar</Text>
              <TextInput
                style={local.input}
                value={draft.notlar}
                onChangeText={(text) => setDraft((p) => ({ ...p, notlar: text }))}
                placeholder="Öğretmen ve yönetici için özel notlar..."
                multiline
              />
            </View>

            {medical?.updatedAt ? (
              <Text style={styles.cardText}>
                Son güncelleme: {new Date(medical.updatedAt).toLocaleDateString('tr-TR')}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, saving && { opacity: 0.6 }]}
              onPress={saveMedical}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScreenShell>
    </>
  );
}

const local = {
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    minHeight: 86,
    padding: 12,
    color: THEME.text,
    textAlignVertical: 'top',
    fontSize: 14,
  },
};
