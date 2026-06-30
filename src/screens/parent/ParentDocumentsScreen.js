// ============================================================
// YUMURCAK — ParentDocumentsScreen.js
// Veli doküman görüntüleme ekranı
// ============================================================
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, StyleSheet } from 'react-native';
import { ScreenShell, EmptyState, LoadingScreen, useNodeList, useParentBase, THEME } from './parentShared';

const DOCUMENT_TYPES = [
  { key: 'yemekListesi', icon: '🍽️', title: 'Yemek Listesi', desc: 'Öğretmenin yüklediği A4 yemek listesi' },
  { key: 'dersProgrami', icon: '📚', title: 'Ders Programı', desc: 'Öğretmenin yüklediği A4 ders programı' },
];

function formatDateTime(value) {
  if (!value) return 'Henüz yüklenmedi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Henüz yüklenmedi';
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function ParentDocumentsScreen({ navigation }) {
  const { loading, selectedChild, sinifId, kresId, childName } = useParentBase();
  const documents = useNodeList('dokumanlar');
  const [selectedType, setSelectedType] = useState('yemekListesi');
  const [previewUrl, setPreviewUrl] = useState('');

  const classDocuments = useMemo(() => {
    if (!sinifId) return {};
    const result = {};

    documents.forEach((item) => {
      if (item?.aktif === false) return;
      if (item?.sinifId !== sinifId) return;
      if (kresId && item?.kresId && item.kresId !== kresId) return;
      result[item.type || item.tip || item.id] = item;
    });

    return result;
  }, [documents, sinifId, kresId]);

  if (loading) return <LoadingScreen text="Dokümanlar hazırlanıyor..." />;

  const selectedConfig = DOCUMENT_TYPES.find((item) => item.key === selectedType) || DOCUMENT_TYPES[0];
  const selectedDocument = classDocuments[selectedType] || null;

  return (
    <ScreenShell title="Dokümanlar" emoji="📁" navigation={navigation} subtitle={childName}>
      {!selectedChild ? (
        <EmptyState icon="👧" title="Çocuk bulunamadı" desc="Dokümanları görüntülemek için çocuğunuzun sınıfa bağlı olması gerekir." />
      ) : (
        <>
          <Text style={styles.infoText}>Öğretmen tarafından yüklenen A4 yemek listesi ve ders programı belgelerini buradan görüntüleyebilirsin.</Text>

          <View style={styles.cardGrid}>
            {DOCUMENT_TYPES.map((item) => {
              const doc = classDocuments[item.key];
              const active = selectedType === item.key;
              return (
                <TouchableOpacity key={item.key} style={[styles.typeCard, active && styles.typeCardActive]} onPress={() => setSelectedType(item.key)} activeOpacity={0.85}>
                  <Text style={styles.typeIcon}>{item.icon}</Text>
                  <Text style={styles.typeTitle}>{item.title}</Text>
                  <Text style={styles.typeDesc}>{doc?.belgeUrl ? 'Görüntüle' : 'Henüz yok'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.viewerCard}>
            <Text style={styles.viewerTitle}>{selectedConfig.icon} {selectedConfig.title}</Text>
            <Text style={styles.viewerDesc}>{selectedDocument?.belgeUrl ? `Son güncelleme: ${formatDateTime(selectedDocument.updatedAt)}` : selectedConfig.desc}</Text>

            {selectedDocument?.belgeUrl ? (
              <TouchableOpacity onPress={() => setPreviewUrl(selectedDocument.belgeUrl)} activeOpacity={0.9}>
                <Image source={{ uri: selectedDocument.belgeUrl }} style={styles.documentImage} resizeMode="contain" />
                <Text style={styles.previewHint}>Büyütmek için belgeye dokun</Text>
              </TouchableOpacity>
            ) : (
              <EmptyState icon="📄" title="Belge yüklenmemiş" desc={`${selectedConfig.title} öğretmen tarafından yüklendiğinde burada görünecek.`} />
            )}
          </View>
        </>
      )}

      <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl('')}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewUrl('')} activeOpacity={0.85}>
            <Text style={styles.modalCloseText}>Kapat</Text>
          </TouchableOpacity>
          {previewUrl ? <Image source={{ uri: previewUrl }} style={styles.modalImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  infoText: { color: THEME.muted, fontWeight: '700', lineHeight: 19, marginBottom: 14 },
  cardGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  typeCard: { flex: 1, backgroundColor: THEME.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: THEME.border, alignItems: 'center' },
  typeCardActive: { borderColor: THEME.primary, backgroundColor: THEME.primarySoft },
  typeIcon: { fontSize: 30, marginBottom: 8 },
  typeTitle: { color: THEME.text, fontWeight: '900', textAlign: 'center' },
  typeDesc: { color: THEME.muted, fontWeight: '700', fontSize: 11, marginTop: 4, textAlign: 'center' },
  viewerCard: { backgroundColor: THEME.card, borderRadius: 24, padding: 15, borderWidth: 1, borderColor: THEME.border },
  viewerTitle: { color: THEME.primary, fontWeight: '900', fontSize: 18 },
  viewerDesc: { color: THEME.muted, fontWeight: '700', marginTop: 5, marginBottom: 12 },
  documentImage: { width: '100%', aspectRatio: 0.707, borderRadius: 18, backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border },
  previewHint: { color: THEME.primary, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', padding: 14, justifyContent: 'center' },
  modalClose: { position: 'absolute', top: 44, right: 18, zIndex: 10, backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 9, paddingHorizontal: 14 },
  modalCloseText: { color: THEME.text, fontWeight: '900' },
  modalImage: { width: '100%', height: '86%' },
});