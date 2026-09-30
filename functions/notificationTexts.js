const SUPPORTED_LANGUAGES = ['tr', 'en', 'ru', 'de', 'fr', 'ar'];

const MONTH_NAMES = {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

const NOTIFICATION_TEXTS = {
  'notification.message': {
    title: { tr: '💬 {{senderName}}', en: '💬 {{senderName}}', ru: '💬 {{senderName}}', de: '💬 {{senderName}}', fr: '💬 {{senderName}}', ar: '💬 {{senderName}}' },
    body: { tr: '{{message}}', en: '{{message}}', ru: '{{message}}', de: '{{message}}', fr: '{{message}}', ar: '{{message}}' },
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
    body: { tr: '{{childName}} için bugünkü uyum kaydı girildi.', en: "Today's adaptation record was added for {{childName}}.", ru: 'Для {{childName}} добавлена сегодняшняя запись об адаптации.', de: 'Der heutige Eingewöhnungseintrag für {{childName}} wurde hinzugefügt.', fr: 'Le suivi d’adaptation du jour de {{childName}} a été ajouté.', ar: 'تمت إضافة سجل التكيف اليومي لـ {{childName}}.' },
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
  'notification.adaptation.score': {
    title: { tr: '🌱 Uyum takibi güncellendi', en: '🌱 Adaptation tracking updated', ru: '🌱 Адаптация обновлена', de: '🌱 Eingewöhnung aktualisiert', fr: '🌱 Suivi d’adaptation mis à jour', ar: '🌱 تم تحديث متابعة التكيف' },
    body: { tr: '{{childName}} için bugünkü uyum kaydı girildi. Skor: {{score}}/100.', en: "Today's adaptation record was added for {{childName}}. Score: {{score}}/100.", ru: 'Для {{childName}} добавлена сегодняшняя запись об адаптации. Оценка: {{score}}/100.', de: 'Der heutige Eingewöhnungseintrag für {{childName}} wurde hinzugefügt. Punktzahl: {{score}}/100.', fr: 'Le suivi d’adaptation du jour de {{childName}} a été ajouté. Score : {{score}}/100.', ar: 'تمت إضافة سجل التكيف اليومي لـ {{childName}}. النتيجة: {{score}}/100.' },
  },
  'notification.payment.new': {
    title: { tr: '💳 Yeni ödeme kaydı', en: '💳 New payment record', ru: '💳 Новая запись об оплате', de: '💳 Neuer Zahlungseintrag', fr: '💳 Nouveau paiement enregistré', ar: '💳 تسجيل دفعة جديدة' },
    body: { tr: '{{childName}} için {{month}} {{year}} dönemine ait {{amount}} ödeme kaydı oluşturuldu.', en: 'A payment record of {{amount}} was created for {{childName}} for {{month}} {{year}}.', ru: 'Для {{childName}} создана запись об оплате {{amount}} за {{month}} {{year}}.', de: 'Für {{childName}} wurde ein Zahlungseintrag über {{amount}} für {{month}} {{year}} erstellt.', fr: 'Un paiement de {{amount}} a été enregistré pour {{childName}} pour {{month}} {{year}}.', ar: 'تم إنشاء سجل دفعة بقيمة {{amount}} لـ {{childName}} عن {{month}} {{year}}.' },
  },
  'notification.meal.published': {
    title: { tr: '🍽️ Yemek listesi güncellendi', en: '🍽️ Meal list updated', ru: '🍽️ Меню обновлено', de: '🍽️ Speiseplan aktualisiert', fr: '🍽️ Menu mis à jour', ar: '🍽️ تم تحديث قائمة الطعام' },
    body: { tr: '{{month}} {{year}} yemek listesi yayınlandı.', en: 'The {{month}} {{year}} meal list was published.', ru: 'Опубликовано меню на {{month}} {{year}}.', de: 'Der Speiseplan für {{month}} {{year}} wurde veröffentlicht.', fr: 'Le menu de {{month}} {{year}} a été publié.', ar: 'تم نشر قائمة الطعام لشهر {{month}} {{year}}.' },
  },
  'notification.schedule.published': {
    title: { tr: '📅 Ders programı güncellendi', en: '📅 Class schedule updated', ru: '📅 Расписание обновлено', de: '📅 Stundenplan aktualisiert', fr: '📅 Emploi du temps mis à jour', ar: '📅 تم تحديث جدول الدروس' },
    body: { tr: '{{className}} sınıfının {{month}} {{year}} ders programı yayınlandı.', en: 'The {{month}} {{year}} schedule for {{className}} was published.', ru: 'Опубликовано расписание класса {{className}} на {{month}} {{year}}.', de: 'Der Stundenplan der Klasse {{className}} für {{month}} {{year}} wurde veröffentlicht.', fr: 'L’emploi du temps de la classe {{className}} pour {{month}} {{year}} a été publié.', ar: 'تم نشر جدول دروس صف {{className}} لشهر {{month}} {{year}}.' },
  },
  'notification.meal.publishedClass': {
    title: { tr: '🍽️ Yemek listesi güncellendi', en: '🍽️ Meal list updated', ru: '🍽️ Меню обновлено', de: '🍽️ Speiseplan aktualisiert', fr: '🍽️ Menu mis à jour', ar: '🍽️ تم تحديث قائمة الطعام' },
    body: { tr: '{{className}} için {{month}} {{year}} yemek listesi yayınlandı.', en: 'The {{month}} {{year}} meal list for {{className}} was published.', ru: 'Опубликовано меню класса {{className}} на {{month}} {{year}}.', de: 'Der Speiseplan für {{className}} für {{month}} {{year}} wurde veröffentlicht.', fr: 'Le menu de {{month}} {{year}} pour {{className}} a été publié.', ar: 'تم نشر قائمة الطعام لشهر {{month}} {{year}} لـ {{className}}.' },
  },
  'notification.bell.coming': {
    title: { tr: '🚗 Veli geliyor', en: '🚗 Parent is coming', ru: '🚗 Родитель едет', de: '🚗 Elternteil kommt', fr: '🚗 Le parent arrive', ar: '🚗 ولي الأمر قادم' },
    body: { tr: '{{parentName}}, {{childName}} için kurum zili gönderdi.', en: '{{parentName}} sent an institution bell for {{childName}}.', ru: '{{parentName}} отправил(а) звонок в учреждение для {{childName}}.', de: '{{parentName}} hat für {{childName}} die Klingel der Einrichtung ausgelöst.', fr: '{{parentName}} a envoyé une alerte à l’établissement pour {{childName}}.', ar: 'أرسل {{parentName}} جرس المؤسسة لـ {{childName}}.' },
  },
  'notification.bell.arrived': {
    title: { tr: '📍 Veli kapıda', en: '📍 Parent is at the door', ru: '📍 Родитель у двери', de: '📍 Elternteil ist an der Tür', fr: '📍 Le parent est à la porte', ar: '📍 ولي الأمر عند الباب' },
    body: { tr: '{{parentName}}, {{childName}} için kurum zili gönderdi.', en: '{{parentName}} sent an institution bell for {{childName}}.', ru: '{{parentName}} отправил(а) звонок в учреждение для {{childName}}.', de: '{{parentName}} hat für {{childName}} die Klingel der Einrichtung ausgelöst.', fr: '{{parentName}} a envoyé une alerte à l’établissement pour {{childName}}.', ar: 'أرسل {{parentName}} جرس المؤسسة لـ {{childName}}.' },
  },
  'notification.medform.approved': {
    title: { tr: '✅ Veli ilaç takip formunu onayladı', en: '✅ Parent approved the medication form', ru: '✅ Родитель одобрил форму лекарства', de: '✅ Elternteil hat das Medikamentenformular genehmigt', fr: '✅ Le parent a approuvé le formulaire de médicament', ar: '✅ وافق ولي الأمر على نموذج الدواء' },
    body: { tr: '{{childName}} için "{{medication}}" ilaç takip formu onaylandı.', en: 'The medication form for {{childName}} for "{{medication}}" was approved.', ru: 'Форма лекарства «{{medication}}» для {{childName}} одобрена.', de: 'Das Medikamentenformular für {{childName}} für „{{medication}}“ wurde genehmigt.', fr: 'Le formulaire du médicament « {{medication}} » pour {{childName}} a été approuvé.', ar: 'تمت الموافقة على نموذج الدواء "{{medication}}" لـ {{childName}}.' },
  },
  'notification.medform.rejected': {
    title: { tr: '❌ Veli ilaç takip formunu reddetti', en: '❌ Parent rejected the medication form', ru: '❌ Родитель отклонил форму лекарства', de: '❌ Elternteil hat das Medikamentenformular abgelehnt', fr: '❌ Le parent a refusé le formulaire de médicament', ar: '❌ رفض ولي الأمر نموذج الدواء' },
    body: { tr: '{{childName}} için "{{medication}}" ilaç takip formu talebi reddedildi.', en: 'The medication form request for {{childName}} for "{{medication}}" was rejected.', ru: 'Запрос на форму лекарства «{{medication}}» для {{childName}} отклонён.', de: 'Die Anfrage für das Medikamentenformular für {{childName}} für „{{medication}}“ wurde abgelehnt.', fr: 'La demande de formulaire du médicament « {{medication}} » pour {{childName}} a été refusée.', ar: 'تم رفض طلب نموذج الدواء "{{medication}}" لـ {{childName}}.' },
  },
  'notification.medform.parentAdded': {
    title: { tr: '💊 Veli yeni ilaç takip formu ekledi', en: '💊 Parent added a new medication form', ru: '💊 Родитель добавил новую форму лекарства', de: '💊 Elternteil hat ein neues Medikamentenformular hinzugefügt', fr: '💊 Le parent a ajouté un nouveau formulaire de médicament', ar: '💊 أضاف ولي الأمر نموذج دواء جديدًا' },
    body: { tr: '{{childName}} için "{{medication}}" formu eklendi.', en: 'A "{{medication}}" medication form was added for {{childName}}.', ru: 'Для {{childName}} добавлена форма лекарства «{{medication}}».', de: 'Für {{childName}} wurde ein Medikamentenformular für „{{medication}}“ hinzugefügt.', fr: 'Un formulaire pour le médicament « {{medication}} » a été ajouté pour {{childName}}.', ar: 'تمت إضافة نموذج دواء "{{medication}}" لـ {{childName}}.' },
  },
  'notification.medform.parentUpdated': {
    title: { tr: '💊 Veli ilaç takip formunu güncelledi', en: '💊 Parent updated the medication form', ru: '💊 Родитель обновил форму лекарства', de: '💊 Elternteil hat das Medikamentenformular aktualisiert', fr: '💊 Le parent a mis à jour le formulaire de médicament', ar: '💊 حدّث ولي الأمر نموذج الدواء' },
    body: { tr: '{{childName}} için "{{medication}}" formu güncellendi.', en: 'The "{{medication}}" medication form for {{childName}} was updated.', ru: 'Форма лекарства «{{medication}}» для {{childName}} обновлена.', de: 'Das Medikamentenformular für {{childName}} für „{{medication}}“ wurde aktualisiert.', fr: 'Le formulaire du médicament « {{medication}} » pour {{childName}} a été mis à jour.', ar: 'تم تحديث نموذج الدواء "{{medication}}" لـ {{childName}}.' },
  },
  'notification.medication.given': {
    title: { tr: '💊 İlaç uygulandı', en: '💊 Medication administered', ru: '💊 Лекарство выдано', de: '💊 Medikament verabreicht', fr: '💊 Médicament administré', ar: '💊 تم إعطاء الدواء' },
    body: { tr: '{{childName}} için bugünkü "{{medication}}" dozu verildi.', en: 'Today’s "{{medication}}" dose was given to {{childName}}.', ru: 'Для {{childName}} сегодня была выдана доза лекарства «{{medication}}».', de: 'Die heutige Dosis „{{medication}}“ wurde {{childName}} verabreicht.', fr: 'La dose de « {{medication}} » d’aujourd’hui a été donnée à {{childName}}.', ar: 'تم إعطاء جرعة "{{medication}}" اليوم لـ {{childName}}.' },
  },
  'notification.medform.awaitingApproval': {
    title: { tr: '💊 İlaç takip formu onayınızı bekliyor', en: '💊 Medication form awaiting your approval', ru: '💊 Форма лекарства ожидает вашего одобрения', de: '💊 Medikamentenformular wartet auf Ihre Genehmigung', fr: '💊 Le formulaire de médicament attend votre approbation', ar: '💊 نموذج الدواء بانتظار موافقتك' },
    body: { tr: '{{childName}} için "{{medication}}" ilaç takip formu oluşturuldu, onayınız bekleniyor.', en: 'A "{{medication}}" medication form was created for {{childName}} and is awaiting your approval.', ru: 'Для {{childName}} создана форма лекарства «{{medication}}», ожидается ваше одобрение.', de: 'Für {{childName}} wurde ein Medikamentenformular für „{{medication}}“ erstellt, das auf Ihre Genehmigung wartet.', fr: 'Un formulaire pour le médicament « {{medication}} » a été créé pour {{childName}} et attend votre approbation.', ar: 'تم إنشاء نموذج دواء "{{medication}}" لـ {{childName}} وينتظر موافقتك.' },
  },
  'notification.service.pickedUp': {
    title: { tr: '🚌 Servise alındı', en: '🚌 Picked up by the bus', ru: '🚌 Ребёнка забрали в автобус', de: '🚌 Vom Fahrdienst abgeholt', fr: '🚌 Pris en charge par le bus', ar: '🚌 تم اصطحابه بالحافلة' },
    body: { tr: '{{name}} servise alındı.', en: '{{name}} was picked up by the bus.', ru: '{{name}} забрали в автобус.', de: '{{name}} wurde vom Fahrdienst abgeholt.', fr: '{{name}} a été pris en charge par le bus.', ar: 'تم اصطحاب {{name}} بالحافلة.' },
  },
  'notification.service.droppedOff': {
    title: { tr: '🏠 Servisten bırakıldı', en: '🏠 Dropped off at home', ru: '🏠 Ребёнка доставили домой', de: '🏠 Nach Hause gebracht', fr: '🏠 Déposé à la maison', ar: '🏠 تم توصيله إلى المنزل' },
    body: { tr: '{{name}} evine bırakıldı.', en: '{{name}} was dropped off at home.', ru: '{{name}} доставили домой.', de: '{{name}} wurde nach Hause gebracht.', fr: '{{name}} a été déposé à la maison.', ar: 'تم توصيل {{name}} إلى المنزل.' },
  },
  'notification.service.arrivedWithChild': {
    title: { tr: '🏫 Servis kuruma ulaştı', en: '🏫 Bus arrived at the institution', ru: '🏫 Автобус прибыл в учреждение', de: '🏫 Fahrdienst ist in der Einrichtung angekommen', fr: '🏫 Le bus est arrivé à l’établissement', ar: '🏫 وصلت الحافلة إلى المؤسسة' },
    body: { tr: '{{name}} ile birlikte {{serviceName}} kuruma ulaştı.', en: '{{serviceName}} arrived at the institution with {{name}}.', ru: '{{serviceName}} прибыл в учреждение вместе с {{name}}.', de: '{{serviceName}} ist mit {{name}} in der Einrichtung angekommen.', fr: '{{serviceName}} est arrivé à l’établissement avec {{name}}.', ar: 'وصل {{serviceName}} إلى المؤسسة مع {{name}}.' },
  },
  'notification.service.arrivedCount': {
    title: { tr: '🏫 Servis kuruma ulaştı', en: '🏫 Bus arrived at the institution', ru: '🏫 Автобус прибыл в учреждение', de: '🏫 Fahrdienst ist in der Einrichtung angekommen', fr: '🏫 Le bus est arrivé à l’établissement', ar: '🏫 وصلت الحافلة إلى المؤسسة' },
    body: { tr: '{{serviceName}} kuruma ulaştı — {{count}} çocuk.', en: '{{serviceName}} arrived at the institution — {{count}} children.', ru: '{{serviceName}} прибыл в учреждение — {{count}} детей.', de: '{{serviceName}} ist in der Einrichtung angekommen — {{count}} Kinder.', fr: '{{serviceName}} est arrivé à l’établissement — {{count}} enfants.', ar: 'وصل {{serviceName}} إلى المؤسسة — {{count}} أطفال.' },
  },
  'notification.subscription.info': {
    title: { tr: 'Abonelik / Ödeme Bilgilendirmesi', en: 'Subscription / Payment Information', ru: 'Информация о подписке / оплате', de: 'Abonnement- / Zahlungsinformation', fr: 'Informations sur l’abonnement / le paiement', ar: 'معلومات الاشتراك / الدفع' },
    body: { tr: '{{text}}', en: '{{text}}', ru: '{{text}}', de: '{{text}}', fr: '{{text}}', ar: '{{text}}' },
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
  const renderParams = { ...params };
  if (renderParams.monthIndex != null) {
    const monthIndex = Number(renderParams.monthIndex);
    if (monthIndex >= 1 && monthIndex <= 12) {
      renderParams.month = MONTH_NAMES[language][monthIndex - 1];
    }
  }
  return {
    title: interpolate(entry.title[language], renderParams),
    body: interpolate(entry.body[language], renderParams),
  };
}

module.exports = { render, SUPPORTED_LANGUAGES, NOTIFICATION_TEXTS };
