// ============================================================
// YUMURCAK — LegalDocumentsScreen.js
// Kullanım Şartları + Gizlilik Politikası + KVKK Aydınlatma Metni
// ============================================================
import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const THEME = {
  primary: '#6C3DEB',
  primaryDark: '#4B22B8',
  primarySoft: '#EFE8FF',
  text: '#191A23',
  muted: '#707386',
  bg: '#F8F6FF',
  card: '#FFFFFF',
  border: '#EEEAF8',
  green: '#20B45B',
  red: '#FF4D6D',
};

const LEGAL_DOCS = [
  {
    key: 'terms',
    icon: '📄',
    title: 'Kullanım Şartları',
    subtitle: 'Yumurcak Kreş Mobil Uygulaması Kullanım Şartları',
    updatedAt: '22 Haziran 2026',
    body: `YUMURCAK KREŞ\nKullanım Şartları\nSon Güncelleme: 22 Haziran 2026\nVersiyon: 1.0\n\nBu Kullanım Şartları (“Şartlar”), Faruk Kurtuluş tarafından geliştirilen ve işletilen Yumurcak Kreş mobil uygulamasının (“Uygulama”) kullanımına ilişkin kuralları düzenler. Uygulamayı indirerek, hesap oluşturarak veya kullanarak bu Şartları kabul etmiş olursunuz. Şartları kabul etmiyorsanız Uygulama'yı kullanmamalısınız.\n\n1. Tanımlar\nUygulama: Yumurcak Kreş mobil uygulaması ve ilişkili tüm hizmetler.\nGeliştirici: Faruk Kurtuluş.\nKurum: Uygulama'yı abone olarak kullanan kreş işletmesi.\nKullanıcı: Süper admin, kurum yöneticisi, öğretmen veya veli rolündeki kişi.\nİçerik: Uygulama'ya girilen tüm rapor, mesaj, fotoğraf, duyuru ve benzeri veriler.\n\n2. Hizmetin Tanımı\nYumurcak Kreş; kreş kurumlarının sınıf, öğretmen, veli ve çocuk yönetimini, günlük rapor, yoklama, yemek listesi, ders programı, etkinlik, duyuru, ödeme takibi, anket, galeri ve mesajlaşma süreçlerini tek bir mobil uygulama üzerinden yürütmesini sağlayan bir kreş yönetimi ve veli iletişimi platformudur.\n\n3. Hesap Oluşturma ve Roller\nUygulama dört farklı kullanıcı rolü üzerinden çalışır: Süper Admin, Kurum Yöneticisi, Öğretmen ve Veli. Hesap bilgilerinizin gizliliğinden ve hesabınız üzerinden yapılan tüm işlemlerden siz sorumlusunuz. Yetkisiz kullanım şüphesi durumunda destek.fkdigital@gmail.com adresine bildirimde bulunmalısınız.\n\n4. Abonelik, Ücretlendirme ve Deneme Süresi\nKurum hesapları için ilk 1 ay ücretsiz deneme süresi tanınır. Deneme süresi sonunda hizmetin kullanımının sürdürülmesi için aylık veya yıllık abonelik planı seçilmesi gerekir. Güncel fiyatlandırma Uygulama içinde ve/veya kurum ile yapılan ayrı ticari anlaşmada belirtilir. Mevcut sürümde ödeme takibi tutar/durum bilgisi üzerinden yapılmaktadır; doğrudan kart bilgisi alınmamaktadır. Çevrimiçi ödeme altyapısı ileride eklenebilir.\n\n5. Kullanıcı Sorumlulukları\nUygulama'ya yalnızca doğru ve yetkili olduğunuz bilgileri girersiniz. Çocuklara ait bilgileri, medikal bilgileri ve fotoğraf/galeri içeriklerini yalnızca ilgili veli izni doğrultusunda sisteme girersiniz. Başka kullanıcı hesaplarına yetkisiz erişmeye çalışmaz, yasa dışı veya hak ihlal eden içerik paylaşmazsınız.\n\n6. Kurum Yöneticisinin Ek Sorumlulukları\nKurum yöneticisi; kreşe kayıtlı velilerden, çocuklarına ait verilerin Uygulama üzerinden işlenmesi konusunda gerekli onay/bilgilendirmeyi aldığını, sisteme girilen verilerin doğruluğundan ve kendi kurumu adına KVKK kapsamındaki yükümlülüklerden sorumlu olduğunu kabul eder.\n\n7. İçerik ve Fikri Mülkiyet\nUygulama'nın tasarımı, kaynak kodu, marka adı ve görsel öğeleri Geliştirici'ye aittir. Kullanıcılar tarafından girilen içerikler ilgili kullanıcıya/kuruma aittir; Geliştirici bu içerikleri yalnızca hizmetin sunulması amacıyla işler ve barındırır.\n\n8. Galeri ve Medya İçerikleri\nKurum yöneticisi ve öğretmenler, veli iznine dayanarak çocuklara ait fotoğraf ve video içeriklerini galeri modülüne yükleyebilir. Galeri içerikleri uygulama içinde 24 saatlik görünürlük mantığıyla sunulur. Süresi dolan medya kayıtları uygulama ekranlarında gösterilmez. Firebase Storage üzerinde fiziksel dosya temizliği, teknik altyapı ve otomatik temizlik mekanizmalarına bağlı olarak yürütülür.\n\n9. Hizmetin Kullanılabilirliği ve Değişiklikler\nGeliştirici, Uygulama'yı geliştirme, bakım veya güvenlik amacıyla güncelleyebilir, geçici olarak durdurabilir veya bazı özellikleri değiştirebilir. Uygulama'nın kesintisiz veya hatasız çalışacağı garanti edilmez.\n\n10. Sorumluluğun Sınırlandırılması\nUygulama “olduğu gibi” sunulmaktadır. Geliştirici; veri kaybı, hizmet kesintisi, kullanıcı tarafından girilen hatalı bilgiler veya üçüncü taraf altyapı sağlayıcılarının hizmet kesintilerinden kaynaklanan dolaylı zararlardan, mevzuatın izin verdiği ölçüde sorumlu tutulamaz. Uygulama, çocuğun fiziksel güvenliğini sağlayan bir gözetim sistemi değildir.\n\n11. Hesap Sonlandırma\nKullanıcılar hesaplarının silinmesini destek.fkdigital@gmail.com adresine talep göndererek isteyebilir. Geliştirici, bu Şartları ihlal eden kullanıcıların hesaplarını askıya alma veya sonlandırma hakkını saklı tutar.\n\n12. Gizlilik\nKişisel verilerinizin nasıl işlendiği hakkında ayrıntılı bilgi için Gizlilik Politikası ve KVKK Aydınlatma Metni'ni inceleyiniz.\n\n13. Uygulanacak Hukuk\nBu Şartlar Türkiye Cumhuriyeti kanunlarına tabidir.\n\n14. İletişim\nGeliştirici: Faruk Kurtuluş\nE-posta: destek.fkdigital@gmail.com\n\nBu metin hukuki danışmanlık niteliği taşımaz; ticari kullanım öncesinde bir hukuk danışmanına başvurulması önerilir.`
  },
  {
    key: 'privacy',
    icon: '🔒',
    title: 'Gizlilik Politikası',
    subtitle: 'Yumurcak Kreş Mobil Uygulaması Gizlilik Politikası',
    updatedAt: '22 Haziran 2026',
    body: `YUMURCAK KREŞ\nGizlilik Politikası\nSon Güncelleme: 22 Haziran 2026\nVersiyon: 1.0\n\nBu Gizlilik Politikası, Faruk Kurtuluş tarafından geliştirilen Yumurcak Kreş mobil uygulamasının kullanıcılarından topladığı bilgileri, bu bilgilerin nasıl kullanıldığını ve korunduğunu açıklar.\n\n1. Hangi Bilgileri Topluyoruz\n\n1.1. Hesap ve Profil Bilgileri\nAd, soyad, telefon numarası, e-posta adresi, kullanıcı rolü, profil fotoğrafı ve bağlı olunan kreş bilgisi (kresId) işlenebilir.\n\n1.2. Çocuk Bilgileri\nÇocuğun adı, soyadı, doğum tarihi, sınıf bilgisi, günlük rapor, yoklama/giriş-çıkış saatleri, medikal bilgiler, fotoğraf ve galeri içerikleri, gelişim raporları işlenebilir.\n\n1.3. İletişim ve Etkileşim Verileri\nMesajlaşma içerikleri, duyuru/etkinlik/ders programı görüntüleme bilgisi, anket cevapları ve Kurum Zili bildirimleri işlenebilir.\n\n1.4. Ödeme ve Abonelik Bilgileri\nAidat/ödeme tutarı ve durumu ile kurum abonelik planı ve süresi işlenebilir. Uygulama kredi kartı numarası gibi hassas ödeme bilgilerini doğrudan toplamaz veya saklamaz.\n\n1.5. Teknik Veriler\nCihaz modeli, işletim sistemi, uygulama sürümü, çökme/hata kayıtları ve Firebase Authentication oturum/giriş kayıtları işlenebilir.\n\n2. Bilgileri Nasıl Kullanıyoruz\nKreş-veli iletişimini sağlamak, yoklama/günlük rapor/ödeme/etkinlik takibini mümkün kılmak, hesap güvenliğini sağlamak, abonelik süreçlerini yürütmek, uygulama performansını izlemek ve hataları gidermek amacıyla kullanırız. Bilgiler reklam amacıyla kullanılmaz ve üçüncü taraflara pazarlama amacıyla satılmaz.\n\n3. Bilgilerin Paylaşılması\nVeriler; Google Firebase altyapısı, kayıtlı olunan kreş kurumu, yasal zorunluluk halinde yetkili merciler ve ileride aktif edilirse opsiyonel yapay zekâ destekli rapor özellikleri için ilgili servis sağlayıcılarla sınırlı şekilde paylaşılabilir.\n\n4. Galeri ve Medya Gizliliği\nFotoğraf ve video içerikleri yalnızca ilgili kreş, sınıf, çocuk ve yetkili kullanıcı kapsamı içinde görüntülenir. Galeri içerikleri uygulama ekranlarında 24 saatlik görünürlük kuralıyla sunulur; süresi dolan içerikler uygulama içinde gösterilmez.\n\n5. Veri Güvenliği\nVeriler Firebase Realtime Database, Firebase Authentication ve Firebase Storage üzerinde rol ve kreş kimliğine dayalı erişim kuralları ile korunur. Bir kreşin verilerine yalnızca o kreşe bağlı yetkili kullanıcıların erişmesi hedeflenir.\n\n6. Verilerin Saklanma Süresi\nVeriler hesabınız veya kreş aboneliğiniz aktif olduğu sürece saklanır. Hesap silme talebinizde, yasal saklama yükümlülükleri hariç olmak üzere verileriniz silinir. Galeri içerikleri uygulama içinde 24 saat sonra görünmez hale getirilir.\n\n7. Çocukların Gizliliği\nUygulama doğrudan çocuklar tarafından kullanılmak üzere tasarlanmamıştır. Çocuklara ait tüm bilgiler veli adına ve veli izniyle, kreş personeli tarafından sisteme girilir.\n\n8. Kullanıcı Hakları\nVerilerinize erişim talep etme, yanlış veya eksik verilerin düzeltilmesini isteme, hesabınızın ve verilerinizin silinmesini talep etme ve veri işleme faaliyetleri hakkında bilgi talep etme haklarına sahipsiniz.\n\n9. Üçüncü Taraf Servisler\nGoogle Firebase kullanılır. Anthropic Claude API gibi yapay zekâ servisleri yalnızca planlanan/opsiyonel özellikler kapsamında, kullanıcılar bilgilendirilerek kullanılabilir. Uygulama şu anda reklam ağı veya analiz amaçlı üçüncü taraf izleme servisi kullanmamaktadır.\n\n10. Değişiklikler ve İletişim\nBu politika güncellenebilir. Sorular için destek.fkdigital@gmail.com adresinden iletişime geçebilirsiniz.\n\nGeliştirici: Faruk Kurtuluş\nE-posta: destek.fkdigital@gmail.com\n\nBu metin hukuki danışmanlık niteliği taşımaz.`
  },
  {
    key: 'kvkk',
    icon: '🛡️',
    title: 'KVKK Aydınlatma Metni',
    subtitle: '6698 Sayılı Kanun Kapsamında Aydınlatma Metni',
    updatedAt: '22 Haziran 2026',
    body: `YUMURCAK KREŞ\nKVKK Aydınlatma Metni\nYürürlük Tarihi: 22 Haziran 2026\nVersiyon: 1.0\n\n1. Veri Sorumlusunun Kimliği\n6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca, Yumurcak Kreş mobil uygulaması kapsamında işlenen kişisel veriler bakımından veri sorumlusu Faruk Kurtuluş'tur.\n\nUygulama: Yumurcak Kreş\nİletişim: destek.fkdigital@gmail.com\n\nYumurcak Kreş, kreş kurumlarına yönelik bir kreş yönetim ve veli iletişim platformudur. Uygulamayı bir kreş adına kullanan kurumlar, kendi veli ve çocuk verilerini işlerken kendi yükümlülüklerinden ayrıca sorumludur.\n\n2. İşlenen Kişisel Veri Kategorileri\n\n2.1. Kimlik ve İletişim Verileri\nAd, soyad, telefon numarası, e-posta adresi, kullanıcı adı/giriş bilgileri ve profil fotoğrafı.\n\n2.2. Çocuğa Ait Veriler\nÇocuğun adı, soyadı, doğum tarihi, sınıf ve kreş bilgisi, günlük rapor verileri, yoklama/giriş-çıkış kayıtları, medikal bilgiler, fotoğraf ve galeri içerikleri, gelişim ve değerlendirme raporları. Medikal bilgiler özel nitelikli kişisel veri niteliğinde olabilir ve yalnızca çocuğun güvenliği/bakımı amacıyla, veli onayı kapsamında işlenir.\n\n2.3. Finansal Veriler\nÖdeme/aidat tutarı ve durumu, abonelik ve fatura bilgileri. Uygulama kart numarası gibi doğrudan ödeme aracı bilgilerini saklamaz.\n\n2.4. İşlem Güvenliği Verileri\nGiriş kayıtları, cihaz ve uygulama sürüm bilgisi, Firebase altyapısı üzerinden dolaylı IP bilgisi.\n\n2.5. Diğer Kullanım Verileri\nMesajlaşma içerikleri, anket cevapları, Kurum Zili bildirim kayıtları, ders programı, etkinlik ve duyuru görüntüleme verileri.\n\n3. Kişisel Verilerin İşlenme Amaçları\nKreş ile veli arasındaki günlük iletişimi sağlamak, çocuğun güvenliği ve bakımını desteklemek, kreş yönetim süreçlerini yürütmek, abonelik ve üyelik süreçlerini yürütmek, anket/oylama mekanizmalarını işletmek, uygulama güvenliğini sağlamak ve yasal yükümlülükleri yerine getirmek.\n\n4. Toplanma Yöntemi ve Hukuki Sebep\nVeriler Uygulama üzerinden elektronik ortamda; kurum yöneticisi, öğretmen, veli veya süper admin tarafından girilmesi yoluyla toplanır. Veriler; sözleşmenin kurulması/ifası, hukuki yükümlülük, meşru menfaat ve gerekli hallerde açık rıza hukuki sebeplerine dayanılarak işlenir. Medikal bilgiler ve fotoğraf/galeri içerikleri bakımından açık rıza önem taşır.\n\n5. Kişisel Verilerin Aktarılması\nVeriler Google Firebase altyapısına, ilgili kreş kurumu yöneticisi/öğretmenine, yasal zorunluluk halinde yetkili kamu kurumlarına ve planlanan opsiyonel yapay zekâ özellikleri için ilgili servis sağlayıcılara sınırlı olarak aktarılabilir. Firebase ve diğer servis sağlayıcılar yurt dışında sunucular kullanabilir.\n\n6. Galeri İçerikleri ve Saklama\nFotoğraf ve video içerikleri, ilgili veli izni ve kurum yetkisi kapsamında işlenir. Galeri içerikleri uygulama içinde 24 saatlik görünürlük kuralına tabidir; süresi dolan medya kayıtları kullanıcı ekranlarında gösterilmez. Fiziksel dosya silme süreçleri teknik altyapı ve otomatik temizlik mekanizmaları çerçevesinde yürütülür.\n\n7. Saklama Süresi\nKişisel veriler ilgili amaçla bağlı kalmak kaydıyla, kreş kaydı/abonelik aktif olduğu süre boyunca ve mevzuatta öngörülen süreler boyunca saklanır. Hesap kapatma veya kreş kaydının sona ermesi halinde veriler, yasal saklama süreleri dolduktan sonra silinir, yok edilir veya anonim hale getirilir.\n\n8. Veri Sahibinin Hakları\nKVKK madde 11 uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, işlenme amacını öğrenme, aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini isteme, silinmesini/yok edilmesini isteme, otomatik analiz sonucu aleyhinize çıkan sonuçlara itiraz etme ve zarar giderimi talep etme haklarına sahipsiniz.\n\n9. Çocuklara Ait Veriler\nUygulama doğrudan çocuklar tarafından kullanılmaz. Çocuğa ait veriler veli, öğretmen veya kurum yöneticisi tarafından, veli izni çerçevesinde sisteme girilir. Veli, çocuğuna ait verilerin görüntülenmesi, düzeltilmesi veya silinmesi talebini kreş yönetimine veya destek.fkdigital@gmail.com adresine iletebilir.\n\n10. Veri Güvenliği\nVeriler Firebase Authentication, Realtime Database ve Storage güvenlik kuralları ile korunur. Erişim kullanıcının rolü ve bağlı olduğu kreş kimliğiyle sınırlandırılır. İnternet üzerinden veri iletimi veya elektronik saklamanın %100 güvenli olduğu garanti edilemez.\n\n11. Değişiklikler\nBu Aydınlatma Metni, yasal düzenlemeler veya uygulama kapsamındaki güncellemeler doğrultusunda değiştirilebilir.\n\nBu metin hukuki danışmanlık niteliği taşımaz; kurumunuzun özel durumuna göre hukuk danışmanına başvurmanız önerilir.`
  }
];

export default function LegalDocumentsScreen({ navigation, route }) {
  const initialKey = route?.params?.docKey;
  const [selectedKey, setSelectedKey] = useState(initialKey || 'terms');

  const selectedDoc = useMemo(
    () => LEGAL_DOCS.find((doc) => doc.key === selectedKey) || LEGAL_DOCS[0],
    [selectedKey]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>⚖️</Text>
          <Text style={styles.heroTitle}>Yasal Metinler</Text>
          <Text style={styles.heroDesc}>Kullanım şartları, gizlilik politikası ve KVKK aydınlatma metni.</Text>
        </View>

        <View style={styles.tabRow}>
          {LEGAL_DOCS.map((doc) => (
            <TouchableOpacity
              key={doc.key}
              style={[styles.tab, selectedKey === doc.key && styles.activeTab]}
              onPress={() => setSelectedKey(doc.key)}
              activeOpacity={0.85}
            >
              <Text style={styles.tabIcon}>{doc.icon}</Text>
              <Text style={[styles.tabText, selectedKey === doc.key && styles.activeTabText]}>{doc.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.docCard}>
          <Text style={styles.docIcon}>{selectedDoc.icon}</Text>
          <Text style={styles.docTitle}>{selectedDoc.title}</Text>
          <Text style={styles.docSubtitle}>{selectedDoc.subtitle}</Text>
          <Text style={styles.updated}>Son Güncelleme: {selectedDoc.updatedAt}</Text>
          <Text style={styles.bodyText}>{selectedDoc.body}</Text>
        </View>

        {navigation?.canGoBack?.() ? (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.backText}>← Geri Dön</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: 16, paddingBottom: 36 },
  hero: { backgroundColor: THEME.primary, borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 14 },
  heroIcon: { fontSize: 42, marginBottom: 8 },
  heroTitle: { color: '#FFF', fontSize: 23, fontWeight: '900' },
  heroDesc: { color: 'rgba(255,255,255,0.84)', marginTop: 6, textAlign: 'center', fontWeight: '700', lineHeight: 19 },
  tabRow: { gap: 10, marginBottom: 14 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: THEME.card, borderRadius: 16, padding: 13, borderWidth: 1, borderColor: THEME.border },
  activeTab: { backgroundColor: THEME.primarySoft, borderColor: THEME.primary },
  tabIcon: { fontSize: 20 },
  tabText: { color: THEME.text, fontWeight: '900', flex: 1 },
  activeTabText: { color: THEME.primaryDark },
  docCard: { backgroundColor: THEME.card, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: THEME.border },
  docIcon: { fontSize: 34, marginBottom: 8 },
  docTitle: { color: THEME.text, fontSize: 22, fontWeight: '900' },
  docSubtitle: { color: THEME.muted, marginTop: 5, fontWeight: '700', lineHeight: 19 },
  updated: { color: THEME.primaryDark, backgroundColor: THEME.primarySoft, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', fontSize: 12, fontWeight: '900', marginTop: 12, marginBottom: 14 },
  bodyText: { color: THEME.text, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  backButton: { backgroundColor: THEME.primary, borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 16 },
  backText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
});