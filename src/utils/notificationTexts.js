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
  'notification.poll': {
    title: { tr: '🗳️ Yeni anket', en: '🗳️ New poll', ru: '🗳️ Новый опрос', de: '🗳️ Neue Umfrage', fr: '🗳️ Nouveau sondage', ar: '🗳️ استطلاع جديد' },
    body: { tr: '{{title}}', en: '{{title}}', ru: '{{title}}', de: '{{title}}', fr: '{{title}}', ar: '{{title}}' },
  },
  'notification.pollReminder': {
    title: { tr: '🗳️ Anket hatırlatması', en: '🗳️ Poll reminder', ru: '🗳️ Напоминание об опросе', de: '🗳️ Erinnerung an die Umfrage', fr: '🗳️ Rappel du sondage', ar: '🗳️ تذكير بالاستطلاع' },
    body: { tr: '"{{title}}" anketine henüz cevap vermediniz.', en: 'You have not answered the "{{title}}" poll yet.', ru: 'Вы ещё не ответили на опрос «{{title}}».', de: 'Sie haben an der Umfrage „{{title}}“ noch nicht teilgenommen.', fr: 'Vous n’avez pas encore répondu au sondage « {{title}} ».', ar: 'لم تجب على استطلاع "{{title}}" بعد.' },
  },
  'notification.badge': {
    title: { tr: '🏅 Yeni rozet', en: '🏅 New badge', ru: '🏅 Новый значок', de: '🏅 Neues Abzeichen', fr: '🏅 Nouveau badge', ar: '🏅 شارة جديدة' },
    body: { tr: '{{childName}} bu hafta "{{badgeTitle}}" rozeti kazandı.', en: '{{childName}} earned the "{{badgeTitle}}" badge this week.', ru: '{{childName}} получил(а) значок «{{badgeTitle}}» на этой неделе.', de: '{{childName}} hat diese Woche das Abzeichen „{{badgeTitle}}“ erhalten.', fr: '{{childName}} a obtenu le badge « {{badgeTitle}} » cette semaine.', ar: 'حصل {{childName}} هذا الأسبوع على شارة "{{badgeTitle}}".' },
  },
  'notification.meal': {
    title: { tr: '🍽️ Yemek listesi güncellendi', en: '🍽️ Meal list updated', ru: '🍽️ Меню обновлено', de: '🍽️ Speiseplan aktualisiert', fr: '🍽️ Menu mis à jour', ar: '🍽️ تم تحديث قائمة الطعام' },
    body: { tr: '{{title}} yayınlandı.', en: '{{title}} was published.', ru: 'Опубликовано: {{title}}.', de: '{{title}} wurde veröffentlicht.', fr: '{{title}} a été publié.', ar: 'تم نشر {{title}}.' },
  },
  'notification.medical': {
    title: { tr: '🩺 Medikal bilgi güncellendi', en: '🩺 Medical information updated', ru: '🩺 Медицинская информация обновлена', de: '🩺 Medizinische Informationen aktualisiert', fr: '🩺 Informations médicales mises à jour', ar: '🩺 تم تحديث المعلومات الطبية' },
    body: { tr: '{{childName}} için medikal bilgiler güncellendi.', en: 'Medical information was updated for {{childName}}.', ru: 'Медицинская информация для {{childName}} обновлена.', de: 'Die medizinischen Informationen für {{childName}} wurden aktualisiert.', fr: 'Les informations médicales de {{childName}} ont été mises à jour.', ar: 'تم تحديث المعلومات الطبية لـ {{childName}}.' },
  },
  'notification.development': {
    title: { tr: '📈 Gelişim kaydı eklendi', en: '📈 Development record added', ru: '📈 Добавлена запись о развитии', de: '📈 Entwicklungsdatensatz hinzugefügt', fr: '📈 Enregistrement de développement ajouté', ar: '📈 تمت إضافة سجل تطور' },
    body: { tr: '{{childName}} için yeni fiziksel gelişim ölçümü kaydedildi.', en: 'A new physical development measurement was recorded for {{childName}}.', ru: 'Для {{childName}} добавлено новое измерение физического развития.', de: 'Für {{childName}} wurde eine neue Messung der körperlichen Entwicklung gespeichert.', fr: 'Une nouvelle mesure du développement physique de {{childName}} a été enregistrée.', ar: 'تم تسجيل قياس جديد للتطور الجسدي لـ {{childName}}.' },
  },
  'notification.adaptation': {
    title: { tr: '🌱 Uyum takibi güncellendi', en: '🌱 Adaptation tracking updated', ru: '🌱 Адаптация обновлена', de: '🌱 Eingewöhnung aktualisiert', fr: '🌱 Suivi d’adaptation mis à jour', ar: '🌱 تم تحديث متابعة التكيف' },
    body: { tr: '{{childName}} için bugünkü uyum kaydı girildi.{{scoreText}}', en: "Today's adaptation record was added for {{childName}}.{{scoreText}}", ru: 'Для {{childName}} добавлена сегодняшняя запись об адаптации.{{scoreText}}', de: 'Der heutige Eingewöhnungseintrag für {{childName}} wurde hinzugefügt.{{scoreText}}', fr: 'Le suivi d’adaptation du jour de {{childName}} a été ajouté.{{scoreText}}', ar: 'تمت إضافة سجل التكيف اليومي لـ {{childName}}.{{scoreText}}' },
  },
  'notification.event': {
    title: { tr: '🎉 {{title}}', en: '🎉 {{title}}', ru: '🎉 {{title}}', de: '🎉 {{title}}', fr: '🎉 {{title}}', ar: '🎉 {{title}}' },
    body: { tr: 'Yeni bir etkinlik eklendi{{dateLabel}}.', en: 'A new event was added{{dateLabel}}.', ru: 'Добавлено новое мероприятие{{dateLabel}}.', de: 'Eine neue Veranstaltung wurde hinzugefügt{{dateLabel}}.', fr: 'Un nouvel événement a été ajouté{{dateLabel}}.', ar: 'تمت إضافة فعالية جديدة{{dateLabel}}.' },
  },
  'notification.birthday.parent': {
    title: { tr: '🎂 Doğum günü kutlu olsun!', en: '🎂 Happy birthday!', ru: '🎂 С днём рождения!', de: '🎂 Alles Gute zum Geburtstag!', fr: '🎂 Joyeux anniversaire !', ar: '🎂 عيد ميلاد سعيد!' },
    body: { tr: '{{childName}} bugün {{age}} yaşına giriyor! 🎉', en: '{{childName}} turns {{age}} today! 🎉', ru: 'Сегодня {{childName}} исполняется {{age}} лет! 🎉', de: '{{childName}} wird heute {{age}} Jahre alt! 🎉', fr: '{{childName}} fête ses {{age}} ans aujourd’hui ! 🎉', ar: 'يُكمل {{childName}} اليوم {{age}} عامًا! 🎉' },
  },
  'notification.birthday.teacher': {
    title: { tr: '🎂 Sınıfınızda doğum günü var', en: '🎂 Birthday in your class', ru: '🎂 День рождения в вашем классе', de: '🎂 Geburtstag in Ihrer Klasse', fr: '🎂 Anniversaire dans votre classe', ar: '🎂 عيد ميلاد في صفك' },
    body: { tr: '{{childName}} bugün doğum günü kutluyor.', en: '{{childName}} is celebrating a birthday today.', ru: 'Сегодня {{childName}} празднует день рождения.', de: '{{childName}} hat heute Geburtstag.', fr: '{{childName}} fête son anniversaire aujourd’hui.', ar: 'يحتفل {{childName}} بعيد ميلاده اليوم.' },
  },
  'notification.medication.parent': {
    title: { tr: '⏰ İlaç saati geldi', en: '⏰ Medication time', ru: '⏰ Время лекарства', de: '⏰ Medikamentenzeit', fr: '⏰ Heure du médicament', ar: '⏰ حان وقت الدواء' },
    body: { tr: '{{childName}} için "{{medication}}" verilme saati ({{time}}) geldi.', en: 'It is time ({{time}}) to give "{{medication}}" to {{childName}}.', ru: 'Пришло время ({{time}}) дать {{childName}} лекарство «{{medication}}».', de: 'Es ist Zeit ({{time}}), {{childName}} „{{medication}}“ zu geben.', fr: 'Il est temps ({{time}}) de donner « {{medication}} » à {{childName}}.', ar: 'حان وقت ({{time}}) إعطاء "{{medication}}" لـ {{childName}}.' },
  },
  'notification.medication.teacher': {
    title: { tr: '⏰ İlaç saati geldi', en: '⏰ Medication time', ru: '⏰ Время лекарства', de: '⏰ Medikamentenzeit', fr: '⏰ Heure du médicament', ar: '⏰ حان وقت الدواء' },
    body: { tr: '{{childName}} için "{{medication}}" verilme zamanı geldi.', en: 'It is time to give "{{medication}}" to {{childName}}.', ru: 'Пришло время дать {{childName}} лекарство «{{medication}}».', de: 'Es ist Zeit, {{childName}} „{{medication}}“ zu geben.', fr: 'Il est temps de donner « {{medication}} » à {{childName}}.', ar: 'حان وقت إعطاء "{{medication}}" لـ {{childName}}.' },
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
