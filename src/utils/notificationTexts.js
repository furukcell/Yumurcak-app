const SUPPORTED_LANGUAGES = ['tr', 'en', 'ru', 'de', 'fr', 'ar'];

const NOTIFICATION_TEXTS = {
  'notification.message': {
    title: { tr: '💬 {{senderName}}', en: '💬 {{senderName}}', ru: '💬 {{senderName}}', de: '💬 {{senderName}}', fr: '💬 {{senderName}}', ar: '💬 {{senderName}}' },
    body: { tr: '{{message}}', en: '{{message}}', ru: '{{message}}', de: '{{message}}', fr: '{{message}}', ar: '{{message}}' },
  },
  'notification.announcement': {
    title: { tr: '📢 Yeni duyuru', en: '📢 New announcement', ru: '📢 Новое объявление', de: '📢 Neue Ankündigung', fr: '📢 Nouvelle annonce', ar: '📢 إعلان جديد' },
    body: { tr: '{{title}}', en: '{{title}}', ru: '{{title}}', de: '{{title}}', fr: '{{title}}', ar: '{{title}}' },
  },
  'notification.paymentDue': {
    title: { tr: '⚠️ Abonelik Ödemesi Bekleniyor', en: '⚠️ Subscription payment due', ru: '⚠️ Ожидается оплата подписки', de: '⚠️ Abonnementzahlung ausstehend', fr: '⚠️ Paiement de l’abonnement en attente', ar: '⚠️ دفعة الاشتراك مستحقة' },
    body: { tr: 'Aboneliğinizin süresi bugün doldu. Kullanıma devam edebilirsiniz, lütfen ödemeyi tamamlayın.', en: 'Your subscription expires today. You can continue using the app; please complete the payment.', ru: 'Срок действия подписки истёк сегодня. Вы можете продолжить пользоваться приложением, пожалуйста, завершите оплату.', de: 'Ihr Abonnement ist heute abgelaufen. Sie können die App weiter nutzen; bitte schließen Sie die Zahlung ab.', fr: 'Votre abonnement expire aujourd’hui. Vous pouvez continuer à utiliser l’application ; veuillez effectuer le paiement.', ar: 'انتهى اشتراكك اليوم. يمكنك متابعة استخدام التطبيق، يرجى إتمام الدفع.' },
  },
  'notification.paymentDue.overdue': {
    title: { tr: '⚠️ Abonelik Ödemesi Bekleniyor', en: '⚠️ Subscription payment overdue', ru: '⚠️ Просрочена оплата подписки', de: '⚠️ Abonnementzahlung überfällig', fr: '⚠️ Paiement de l’abonnement en retard', ar: '⚠️ دفعة الاشتراك متأخرة' },
    body: { tr: 'Aboneliğinizin süresi {{daysOverdue}} gündür geçti. Erişiminizin kesilmemesi için lütfen ödemeyi tamamlayın.', en: 'Your subscription is {{daysOverdue}} days overdue. Please complete the payment to avoid losing access.', ru: 'Срок действия вашей подписки истёк {{daysOverdue}} дней назад. Завершите оплату, чтобы не потерять доступ.', de: 'Ihr Abonnement ist seit {{daysOverdue}} Tagen abgelaufen. Bitte schließen Sie die Zahlung ab, damit Ihr Zugang erhalten bleibt.', fr: 'Votre abonnement a expiré il y a {{daysOverdue}} jours. Veuillez effectuer le paiement pour éviter la perte d’accès.', ar: 'انتهت صلاحية اشتراكك منذ {{daysOverdue}} يومًا. يرجى إتمام الدفع لتجنب فقدان الوصول.' },
  },
  'notification.paymentDue.superadmin': {
    title: { tr: '🔴 Kurum 7 Gündür Ödeme Yapmadı', en: '🔴 Institution payment is 7 days overdue', ru: '🔴 Учреждение просрочило оплату на 7 дней', de: '🔴 Zahlung der Einrichtung seit 7 Tagen überfällig', fr: '🔴 Paiement de l’établissement en retard de 7 jours', ar: '🔴 دفعة المؤسسة متأخرة لمدة 7 أيام' },
    body: { tr: '{{kresAdi}} aboneliği 7 gündür geçmiş durumda. İncelemek ister misin?', en: '{{kresAdi}} subscription is 7 days overdue. Would you like to review it?', ru: 'Подписка {{kresAdi}} просрочена на 7 дней. Хотите проверить?', de: 'Das Abonnement von {{kresAdi}} ist seit 7 Tagen überfällig. Möchten Sie es prüfen?', fr: 'L’abonnement de {{kresAdi}} a 7 jours de retard. Voulez-vous le vérifier ?', ar: 'اشتراك {{kresAdi}} متأخر لمدة 7 أيام. هل تريد مراجعته؟' },
  },
  'notification.dailyReport': {
    title: { tr: '📋 Günlük rapor hazır', en: '📋 Daily report ready', ru: '📋 Ежедневный отчёт готов', de: '📋 Tagesbericht ist fertig', fr: '📋 Rapport quotidien disponible', ar: '📋 التقرير اليومي جاهز' },
    body: { tr: '{{childName}} için bugünkü günlük rapor girildi.', en: "Today's daily report was added for {{childName}}.", ru: 'Добавлен ежедневный отчёт за сегодня для {{childName}}.', de: 'Der heutige Tagesbericht für {{childName}} wurde hinzugefügt.', fr: 'Le rapport quotidien d’aujourd’hui a été ajouté pour {{childName}}.', ar: 'تمت إضافة التقرير اليومي لليوم لـ {{childName}}.' },
  },
  'notification.attendance.absent': {
    title: { tr: '✅ Yoklama güncellendi', en: '✅ Attendance updated', ru: '✅ Посещаемость обновлена', de: '✅ Anwesenheit aktualisiert', fr: '✅ Présence mise à jour', ar: '✅ تم تحديث الحضور' },
    body: { tr: '{{childName}} bugün gelmedi olarak işaretlendi.', en: '{{childName}} was marked absent today.', ru: '{{childName}} отмечен как отсутствующий сегодня.', de: '{{childName}} wurde heute als abwesend markiert.', fr: '{{childName}} a été marqué absent aujourd’hui.', ar: 'تم تسجيل {{childName}} كغائب اليوم.' },
  },
  'notification.attendance.late': {
    title: { tr: '✅ Yoklama güncellendi', en: '✅ Attendance updated', ru: '✅ Посещаемость обновлена', de: '✅ Anwesenheit aktualisiert', fr: '✅ Présence mise à jour', ar: '✅ تم تحديث الحضور' },
    body: { tr: '{{childName}} bugün geç geldi olarak işaretlendi.', en: '{{childName}} was marked late today.', ru: 'Для {{childName}} сегодня отмечено опоздание.', de: '{{childName}} wurde heute als verspätet markiert.', fr: '{{childName}} a été marqué en retard aujourd’hui.', ar: 'تم تسجيل {{childName}} كمتأخر اليوم.' },
  },
  'notification.attendance.present': {
    title: { tr: '✅ Yoklama güncellendi', en: '✅ Attendance updated', ru: '✅ Посещаемость обновлена', de: '✅ Anwesenheit aktualisiert', fr: '✅ Présence mise à jour', ar: '✅ تم تحديث الحضور' },
    body: { tr: '{{childName}} bugün okula geldi olarak işaretlendi.', en: '{{childName}} was marked present today.', ru: '{{childName}} отмечен как присутствующий сегодня.', de: '{{childName}} wurde heute als anwesend markiert.', fr: '{{childName}} a été marqué présent aujourd’hui.', ar: 'تم تسجيل {{childName}} كحاضر اليوم.' },
  },
  'notification.gallery.photo': {
    title: { tr: '🖼️ Galeriye yeni paylaşım', en: '🖼️ New gallery post', ru: '🖼️ Новая публикация в галерее', de: '🖼️ Neuer Galeriebeitrag', fr: '🖼️ Nouvelle publication dans la galerie', ar: '🖼️ مشاركة جديدة في المعرض' },
    body: { tr: '{{title}}: Yeni fotoğraf yüklendi.', en: '{{title}}: A new photo was uploaded.', ru: '{{title}}: Загружена новая фотография.', de: '{{title}}: Ein neues Foto wurde hochgeladen.', fr: '{{title}} : Une nouvelle photo a été ajoutée.', ar: '{{title}}: تم رفع صورة جديدة.' },
  },
  'notification.gallery.video': {
    title: { tr: '🖼️ Galeriye yeni paylaşım', en: '🖼️ New gallery post', ru: '🖼️ Новая публикация в галерее', de: '🖼️ Neuer Galeriebeitrag', fr: '🖼️ Nouvelle publication dans la galerie', ar: '🖼️ مشاركة جديدة في المعرض' },
    body: { tr: '{{title}}: Yeni video yüklendi.', en: '{{title}}: A new video was uploaded.', ru: '{{title}}: Загружено новое видео.', de: '{{title}}: Ein neues Video wurde hochgeladen.', fr: '{{title}} : Une nouvelle vidéo a été ajoutée.', ar: '{{title}}: تم رفع فيديو جديد.' },
  },
  'notification.gallery.multiple': {
    title: { tr: '🖼️ Galeriye yeni paylaşım', en: '🖼️ New gallery post', ru: '🖼️ Новая публикация в галерее', de: '🖼️ Neuer Galeriebeitrag', fr: '🖼️ Nouvelle publication dans la galerie', ar: '🖼️ مشاركة جديدة في المعرض' },
    body: { tr: '{{title}}: {{mediaCount}} yeni medya yüklendi.', en: '{{title}}: {{mediaCount}} new media items were uploaded.', ru: '{{title}}: загружено новых медиафайлов: {{mediaCount}}.', de: '{{title}}: {{mediaCount}} neue Medien wurden hochgeladen.', fr: '{{title}} : {{mediaCount}} nouveaux médias ont été ajoutés.', ar: '{{title}}: تم رفع {{mediaCount}} ملفات وسائط جديدة.' },
  },
};

function interpolate(template, params = {}) {
  return String(template || '').replace(/{{\s*([^{}]+?)\s*}}/g, (_, key) => {
    const value = params[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function normalizeLanguage(lang) {
  const value = String(lang || '').toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(value) ? value : null;
}

function render(key, lang, params = {}) {
  const language = normalizeLanguage(lang);
  const entry = NOTIFICATION_TEXTS[key];
  if (!language || !entry || !entry.title?.[language] || !entry.body?.[language]) return null;
  return {
    title: interpolate(entry.title[language], params),
    body: interpolate(entry.body[language], params),
  };
}

export { render, SUPPORTED_LANGUAGES, NOTIFICATION_TEXTS };
