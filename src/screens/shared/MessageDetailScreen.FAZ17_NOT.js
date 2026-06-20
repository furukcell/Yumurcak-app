// ============================================================
// YUMURCAK — MessageDetailScreen.js EK NOT
// FAZ 17 için MessageDetailScreen dosyanda sadece import ve sendMessage update kısmına ekleme yap.
// Eğer FAZ 16 dosyanı aynen kullanıyorsan aşağıdaki iki parçayı elle ekle.
// ============================================================

// 1) En üste import ekle:
import { addConversationIndexUpdates } from '../../utils/firebaseIndexHelpers';

// 2) sendMessage içinde, await update(...) öncesinde şunu ekle:
//    const rootUpdates = {};
//    addConversationIndexUpdates(rootUpdates, conversationId, updates);
//    await update(ref(database), rootUpdates);
//
// 3) Mevcut konuşma update satırın kalsın:
//    await update(ref(database, `mesajKonusmalari/${conversationId}`), updates);

// Pratik ve güvenli sebep:
// Eski MessageDetailScreen'i komple ezmek yerine sadece index eklemesi yapılır.
// Çünkü FAZ 16 mesaj input / okundu / daha fazla yükle sistemi çalışıyorsa bozmayalım.
