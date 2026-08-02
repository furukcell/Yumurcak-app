// ============================================================
// YUMURCAK — AnnouncementTemplatePicker.js
// FAZ 9: "Şablon Kullan" — Aidat / Toplantı / Tatil / Veli Bilgilendirmesi
// şablonlarından birini seçip değişken alanları (tarih, tutar, yer vb.)
// doldurunca başlık+mesajı üretip parent forma (AnnouncementFormScreen)
// tek dokunuşla yazan modal. ActivityLibraryPicker/MonthlyArchivePicker
// ile AYNI desen: trigger butonu + kendi state'ini kendi yöneten modal.
// ============================================================
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DUYURU_SABLONLARI } from '../constants';

function doldurSablon(sablonMetni, degerler) {
  return sablonMetni.replace(/\{(\w+)\}/g, (eslesme, anahtar) => {
    const deger = (degerler[anahtar] || '').trim();
    return deger || eslesme;
  });
}

export default function AnnouncementTemplatePicker({ onApply, theme }) {
  const palette = theme || { primary: '#27500A', primarySoft: '#EAF5E4', text: '#191A23', muted: '#707386', card: '#FFFFFF', border: '#EEEAF8', bg: '#FAFAFA' };

  const [open, setOpen] = useState(false);
  const [secilenSablon, setSecilenSablon] = useState(null);
  const [degerler, setDegerler] = useState({});

  function openPicker() {
    setSecilenSablon(null);
    setDegerler({});
    setOpen(true);
  }

  function sablonSec(sablon) {
    setSecilenSablon(sablon);
    setDegerler({});
  }

  function alanDegisti(key, value) {
    setDegerler((onceki) => ({ ...onceki, [key]: value }));
  }

  function zorunluAlanlarDoluMu() {
    if (!secilenSablon) return false;
    return secilenSablon.alanlar
      .filter((alan) => !alan.optional)
      .every((alan) => (degerler[alan.key] || '').trim().length > 0);
  }

  function handleKullan() {
    if (!secilenSablon || !zorunluAlanlarDoluMu()) return;

    let baslik = doldurSablon(secilenSablon.baslikSablonu, degerler);
    let mesaj = doldurSablon(secilenSablon.mesajSablonu, degerler);

    // Şablon metninde yer tutucusu olmayan ama doldurulmuş opsiyonel
    // alanları (örn. Veli Bilgilendirmesi'ndeki "tarih") mesajın sonuna ekle.
    secilenSablon.alanlar.forEach((alan) => {
      const deger = (degerler[alan.key] || '').trim();
      const yerTutucuVarMi =
        secilenSablon.baslikSablonu.includes(`{${alan.key}}`) ||
        secilenSablon.mesajSablonu.includes(`{${alan.key}}`);

      if (deger && !yerTutucuVarMi) {
        mesaj += ` ${alan.label}: ${deger}.`;
      }
    });

    setOpen(false);
    onApply(baslik.trim(), mesaj.trim());
  }

  return (
    <>
      <TouchableOpacity style={[styles.trigger, { backgroundColor: palette.primarySoft }]} onPress={openPicker} activeOpacity={0.85}>
        <Text style={[styles.triggerText, { color: palette.primary }]}>📋 Şablon Kullan</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: palette.text }]}>
                {secilenSablon ? secilenSablon.label : 'Duyuru Şablonu Seç'}
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.8}>
                <Text style={[styles.close, { color: palette.primary }]}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {!secilenSablon ? (
              <ScrollView style={styles.listScroll}>
                {DUYURU_SABLONLARI.map((sablon) => (
                  <TouchableOpacity
                    key={sablon.key}
                    style={[styles.row, { borderColor: palette.border }]}
                    onPress={() => sablonSec(sablon)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.rowIcon}>{sablon.icon}</Text>
                    <Text style={[styles.rowTitle, { color: palette.text }]}>{sablon.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <>
                <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
                  {secilenSablon.alanlar.map((alan) => (
                    <View key={alan.key} style={styles.field}>
                      <Text style={[styles.fieldLabel, { color: palette.text }]}>
                        {alan.label}{alan.optional ? '' : ' *'}
                      </Text>
                      <TextInput
                        value={degerler[alan.key] || ''}
                        onChangeText={(text) => alanDegisti(alan.key, text)}
                        placeholder={alan.placeholder}
                        placeholderTextColor={palette.muted}
                        multiline={!!alan.textArea}
                        style={[
                          styles.input,
                          alan.textArea && styles.inputTextArea,
                          { backgroundColor: palette.bg, borderColor: palette.border, color: palette.text },
                        ]}
                      />
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.backButton, { borderColor: palette.border }]}
                    onPress={() => setSecilenSablon(null)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.backButtonText, { color: palette.text }]}>Geri</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.applyButton,
                      { backgroundColor: zorunluAlanlarDoluMu() ? palette.primary : palette.border },
                    ]}
                    onPress={handleKullan}
                    disabled={!zorunluAlanlarDoluMu()}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.applyButtonText}>Formu Doldur</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  triggerText: { fontWeight: '900', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 460, maxHeight: '80%', borderRadius: 22, borderWidth: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '900' },
  close: { fontWeight: '900' },

  listScroll: { maxHeight: 360 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  rowIcon: { fontSize: 20, marginRight: 10 },
  rowTitle: { fontWeight: '900', fontSize: 14 },

  formScroll: { maxHeight: 320 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontWeight: '700' },
  inputTextArea: { minHeight: 80, textAlignVertical: 'top' },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  backButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  backButtonText: { fontWeight: '900' },
  applyButton: { flex: 2, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  applyButtonText: { color: '#FFF', fontWeight: '900' },
});
