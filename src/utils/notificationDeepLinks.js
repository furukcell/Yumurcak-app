// ============================================================
// YUMURCAK — notificationDeepLinks.js
// Push bildirime tıklayınca doğru ekrana yönlendirme haritası
// ============================================================

export const YUMURCAK_LINKING = {
  prefixes: ['yumurcak://'],
  config: {
    screens: {
      Notifications: 'notifications',
      MessageDetail: 'messages/:messageId?',

      ParentDashboard: 'parent/home',
      ParentReports: 'parent/reports',
      ParentAnnouncements: 'parent/announcements',
      ParentMeals: 'parent/meals',
      ParentEvents: 'parent/events',
      ParentAttendance: 'parent/attendance',
      ParentDevelopment: 'parent/development',
      ParentUyum: 'parent/adaptation',
      ParentBadges: 'parent/badges',
      ParentMedical: 'parent/medical',
      ParentService: 'parent/service',
      ParentMessages: 'parent/messages',
      ParentGallery: 'parent/gallery',
      ParentDocuments: 'parent/documents',
      ParentBell: 'parent/bell',
      ParentPayments: 'parent/payments',
      ParentPolls: 'parent/polls',

      TeacherDashboard: 'teacher/home',
      TeacherChildren: 'teacher/children',
      TeacherAttendance: 'teacher/attendance',
      TeacherSchedule: 'teacher/schedule',
      TeacherEvents: 'teacher/events',
      TeacherMeals: 'teacher/meals',
      TeacherDocuments: 'teacher/documents',
      TeacherMedical: 'teacher/medical',
      TeacherAnnouncements: 'teacher/announcements',
      TeacherMessages: 'teacher/messages',
      TeacherGallery: 'teacher/gallery',
      TeacherProfile: 'teacher/profile',
      TeacherPhysicalDevelopment: 'teacher/development',
      TeacherAdaptationTracking: 'teacher/adaptation',
      TeacherWeeklyStar: 'teacher/badges',

      Dashboard: 'admin/home',
      AdminStatistics: 'admin/statistics',
      AdminGallery: 'admin/gallery',
      AdminMonthlyMeal: 'admin/meals',
      InstitutionSettings: 'admin/institution',
      ThemeSettings: 'admin/theme',
      Subscription: 'admin/subscription',
      AdminMessages: 'admin/messages',
      ClassList: 'admin/classes',
      ChildList: 'admin/children',
      TeacherList: 'admin/teachers',
      VeliList: 'admin/parents',
      AnnouncementList: 'admin/announcements',
      PaymentList: 'admin/payments',
      PollManagement: 'admin/polls',
      AdminBell: 'admin/bell',
      LessonScheduleList: 'admin/schedule',
      EventList: 'admin/events',
    },
  },
};

const ROUTE_TO_URL = {
  Notifications: 'yumurcak://notifications',
  MessageDetail: 'yumurcak://messages',

  ParentDashboard: 'yumurcak://parent/home',
  ParentReports: 'yumurcak://parent/reports',
  ParentAnnouncements: 'yumurcak://parent/announcements',
  ParentMeals: 'yumurcak://parent/meals',
  ParentEvents: 'yumurcak://parent/events',
  ParentAttendance: 'yumurcak://parent/attendance',
  ParentDevelopment: 'yumurcak://parent/development',
  ParentUyum: 'yumurcak://parent/adaptation',
  ParentBadges: 'yumurcak://parent/badges',
  ParentMedical: 'yumurcak://parent/medical',
  ParentService: 'yumurcak://parent/service',
  ParentMessages: 'yumurcak://parent/messages',
  ParentGallery: 'yumurcak://parent/gallery',
  ParentDocuments: 'yumurcak://parent/documents',
  ParentBell: 'yumurcak://parent/bell',
  ParentPayments: 'yumurcak://parent/payments',
  ParentPolls: 'yumurcak://parent/polls',

  TeacherDashboard: 'yumurcak://teacher/home',
  TeacherChildren: 'yumurcak://teacher/children',
  TeacherAttendance: 'yumurcak://teacher/attendance',
  TeacherSchedule: 'yumurcak://teacher/schedule',
  TeacherEvents: 'yumurcak://teacher/events',
  TeacherMeals: 'yumurcak://teacher/meals',
  TeacherDocuments: 'yumurcak://teacher/documents',
  TeacherMedical: 'yumurcak://teacher/medical',
  TeacherAnnouncements: 'yumurcak://teacher/announcements',
  TeacherMessages: 'yumurcak://teacher/messages',
  TeacherGallery: 'yumurcak://teacher/gallery',
  TeacherProfile: 'yumurcak://teacher/profile',
  TeacherPhysicalDevelopment: 'yumurcak://teacher/development',
  TeacherAdaptationTracking: 'yumurcak://teacher/adaptation',
  TeacherWeeklyStar: 'yumurcak://teacher/badges',

  Dashboard: 'yumurcak://admin/home',
  AdminDashboard: 'yumurcak://admin/home',
  AdminStatistics: 'yumurcak://admin/statistics',
  AdminGallery: 'yumurcak://admin/gallery',
  AdminMonthlyMeal: 'yumurcak://admin/meals',
  InstitutionSettings: 'yumurcak://admin/institution',
  ThemeSettings: 'yumurcak://admin/theme',
  Subscription: 'yumurcak://admin/subscription',
  AdminMessages: 'yumurcak://admin/messages',
  ClassList: 'yumurcak://admin/classes',
  ChildList: 'yumurcak://admin/children',
  TeacherList: 'yumurcak://admin/teachers',
  VeliList: 'yumurcak://admin/parents',
  AnnouncementList: 'yumurcak://admin/announcements',
  AdminAnnouncements: 'yumurcak://admin/announcements',
  PaymentList: 'yumurcak://admin/payments',
  AdminPayments: 'yumurcak://admin/payments',
  PollManagement: 'yumurcak://admin/polls',
  AdminBell: 'yumurcak://admin/bell',
  LessonScheduleList: 'yumurcak://admin/schedule',
  EventList: 'yumurcak://admin/events',
};

const TYPE_MAP = {
  parent: {
    rapor: 'yumurcak://parent/reports',
    gunlukrapor: 'yumurcak://parent/reports',
    galeri: 'yumurcak://parent/gallery',
    foto: 'yumurcak://parent/gallery',
    fotograf: 'yumurcak://parent/gallery',
    video: 'yumurcak://parent/gallery',
    anket: 'yumurcak://parent/polls',
    poll: 'yumurcak://parent/polls',
    rozet: 'yumurcak://parent/badges',
    badge: 'yumurcak://parent/badges',
    yoklama: 'yumurcak://parent/attendance',
    attendance: 'yumurcak://parent/attendance',
    yemek: 'yumurcak://parent/meals',
    meal: 'yumurcak://parent/meals',
    gelisim: 'yumurcak://parent/development',
    gelişim: 'yumurcak://parent/development',
    development: 'yumurcak://parent/development',
    uyum: 'yumurcak://parent/adaptation',
    adaptation: 'yumurcak://parent/adaptation',
    duyuru: 'yumurcak://parent/announcements',
    announcement: 'yumurcak://parent/announcements',
    mesaj: 'yumurcak://parent/messages',
    message: 'yumurcak://parent/messages',
    belge: 'yumurcak://parent/documents',
    dokuman: 'yumurcak://parent/documents',
    doküman: 'yumurcak://parent/documents',
    document: 'yumurcak://parent/documents',
    odeme: 'yumurcak://parent/payments',
    ödeme: 'yumurcak://parent/payments',
    payment: 'yumurcak://parent/payments',
    zil: 'yumurcak://parent/bell',
    bell: 'yumurcak://parent/bell',
    medikal: 'yumurcak://parent/medical',
    medical: 'yumurcak://parent/medical',
  },
  teacher: {
    rapor: 'yumurcak://teacher/children',
    gunlukrapor: 'yumurcak://teacher/children',
    galeri: 'yumurcak://teacher/gallery',
    foto: 'yumurcak://teacher/gallery',
    fotograf: 'yumurcak://teacher/gallery',
    video: 'yumurcak://teacher/gallery',
    yoklama: 'yumurcak://teacher/attendance',
    attendance: 'yumurcak://teacher/attendance',
    yemek: 'yumurcak://teacher/meals',
    meal: 'yumurcak://teacher/meals',
    ders: 'yumurcak://teacher/schedule',
    program: 'yumurcak://teacher/schedule',
    schedule: 'yumurcak://teacher/schedule',
    medikal: 'yumurcak://teacher/medical',
    medical: 'yumurcak://teacher/medical',
    duyuru: 'yumurcak://teacher/announcements',
    announcement: 'yumurcak://teacher/announcements',
    mesaj: 'yumurcak://teacher/messages',
    message: 'yumurcak://teacher/messages',
    belge: 'yumurcak://teacher/documents',
    dokuman: 'yumurcak://teacher/documents',
    doküman: 'yumurcak://teacher/documents',
    document: 'yumurcak://teacher/documents',
    gelisim: 'yumurcak://teacher/development',
    gelişim: 'yumurcak://teacher/development',
    development: 'yumurcak://teacher/development',
    uyum: 'yumurcak://teacher/adaptation',
    adaptation: 'yumurcak://teacher/adaptation',
    rozet: 'yumurcak://teacher/badges',
    badge: 'yumurcak://teacher/badges',
  },
  admin: {
    galeri: 'yumurcak://admin/gallery',
    foto: 'yumurcak://admin/gallery',
    fotograf: 'yumurcak://admin/gallery',
    video: 'yumurcak://admin/gallery',
    yemek: 'yumurcak://admin/meals',
    meal: 'yumurcak://admin/meals',
    medikal: 'yumurcak://admin/children',
    medical: 'yumurcak://admin/children',
    duyuru: 'yumurcak://admin/announcements',
    announcement: 'yumurcak://admin/announcements',
    mesaj: 'yumurcak://admin/messages',
    message: 'yumurcak://admin/messages',
    anket: 'yumurcak://admin/polls',
    poll: 'yumurcak://admin/polls',
    odeme: 'yumurcak://admin/payments',
    ödeme: 'yumurcak://admin/payments',
    payment: 'yumurcak://admin/payments',
    zil: 'yumurcak://admin/bell',
    bell: 'yumurcak://admin/bell',
    ders: 'yumurcak://admin/schedule',
    program: 'yumurcak://admin/schedule',
    schedule: 'yumurcak://admin/schedule',
    etkinlik: 'yumurcak://admin/events',
    event: 'yumurcak://admin/events',
    sinif: 'yumurcak://admin/classes',
    sınıf: 'yumurcak://admin/classes',
    cocuk: 'yumurcak://admin/children',
    çocuk: 'yumurcak://admin/children',
    ogretmen: 'yumurcak://admin/teachers',
    öğretmen: 'yumurcak://admin/teachers',
    veli: 'yumurcak://admin/parents',
  },
};

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function compactKey(value) {
  return normalizeText(value).replace(/[\s_\-.]/g, '');
}

function getRoleGroup(role) {
  const value = normalizeText(role);
  if (value.includes('ogretmen') || value.includes('öğretmen')) return 'teacher';
  if (value.includes('veli') || value.includes('parent')) return 'parent';
  if (value.includes('yonetici') || value.includes('yönetici') || value.includes('admin')) return 'admin';
  return 'parent';
}

function routeUrlForRole(route, role) {
  if (!route) return null;
  const group = getRoleGroup(role);

  if (route === 'TeacherMedical' && group === 'admin') return 'yumurcak://admin/children';
  if (route === 'ParentPolls' && group === 'admin') return 'yumurcak://admin/polls';
  if (route === 'ParentPayments' && group === 'admin') return 'yumurcak://admin/payments';
  if (route === 'ParentGallery' && group === 'admin') return 'yumurcak://admin/gallery';
  if (route === 'ParentMeals' && group === 'admin') return 'yumurcak://admin/meals';

  return ROUTE_TO_URL[route] || null;
}

function urlFromType(type, role) {
  const key = compactKey(type);
  if (!key) return null;
  const group = getRoleGroup(role);
  return TYPE_MAP[group]?.[key] || null;
}

export function getNotificationUrlFromData(data = {}, role) {
  const directUrl = data.url || data.deepLink || data.link;
  if (typeof directUrl === 'string' && directUrl.startsWith('yumurcak://')) return directUrl;
  if (typeof directUrl === 'string' && directUrl.startsWith('/')) return `yumurcak://${directUrl.replace(/^\/+/, '')}`;

  const targetRole = data.role || data.targetRole || role;
  const route = data.routeName || data.screen || data.route || data.targetScreen || data.navigateTo;
  const routeUrl = routeUrlForRole(route, targetRole);
  if (routeUrl) return routeUrl;

  const typeCandidates = [
    data.tip,
    data.type,
    data.notificationType,
    data.kind,
    data.category,
    data.documentType,
    data.dokumanTipi,
    data.belgeTipi,
  ];

  for (const candidate of typeCandidates) {
    const url = urlFromType(candidate, targetRole);
    if (url) return url;
  }

  return null;
}