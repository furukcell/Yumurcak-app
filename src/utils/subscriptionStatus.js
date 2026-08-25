// ============================================================
// YUMURCAK — subscriptionStatus.js
// FAZ 15: Merkezi abonelik durumu hesaplama
// ============================================================

export function parseSubscriptionDate(value) {
  if (!value) return null;

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    // TR formatı: 20.06.2026
    const trMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (trMatch) {
      const [, d, m, y] = trMatch;
      const date = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function getSubscriptionEndDate(subscription = {}) {
  return parseSubscriptionDate(
    subscription.bitisTarihi ||
    subscription.demoBitisTarihi ||
    subscription.bitis ||
    subscription.endDate ||
    subscription.expiresAt
  );
}

export function getRemainingDays(subscription = {}) {
  const endDate = getSubscriptionEndDate(subscription);
  if (!endDate) return null;

  const diff = endDate.getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export function getSubscriptionStatus(subscription = {}) {
  const hasSubscription = subscription && Object.keys(subscription).length > 0;

  if (!hasSubscription) {
    return {
      key: 'none',
      aktif: false,
      blocked: true,
      label: 'Abonelik Yok',
      message: 'Bu kurum için aktif abonelik bulunamadı.',
      remainingDays: null,
    };
  }

  const durum = String(subscription.durum || subscription.status || '').toLowerCase();
  const plan = String(subscription.plan || subscription.paket || '').toLowerCase();
  const remainingDays = getRemainingDays(subscription);

  const isDemo = durum.includes('demo') || plan.includes('demo');
  const isActive = durum.includes('aktif') || durum.includes('active');

  // Süre bittiğinde sistem hemen kapatmaz — sınırsız "ödeme bekleniyor" (grace)
  // moduna geçer, kurum kullanmaya devam edebilir ve bildirimlerle uyarılır.
  // Erişimi kesmenin TEK yolu superadminin elle işaretlediği erisimKisitli flag'i.
  if (remainingDays !== null && remainingDays < 0) {
    const daysOverdue = Math.abs(remainingDays);

    if (subscription.erisimKisitli) {
      return {
        key: 'blocked_manual',
        aktif: false,
        blocked: true,
        label: 'Erişim Kısıtlandı',
        message: 'Ödeme yapılmadığı için erişiminiz kısıtlandı. Devam etmek için ekibimizle iletişime geçin.',
        remainingDays,
        daysOverdue,
      };
    }

    return {
      key: 'grace_period',
      aktif: true,
      blocked: false,
      label: 'Ödeme Bekleniyor',
      message: `Aboneliğinizin süresi ${daysOverdue} gün önce doldu. Kullanıma devam edebilirsiniz, ancak lütfen ödemeyi tamamlayın.`,
      remainingDays,
      daysOverdue,
    };
  }

  if (remainingDays !== null && remainingDays <= 3 && (isActive || isDemo)) {
    return {
      key: 'expiring_soon',
      aktif: true,
      blocked: false,
      label: `${remainingDays} Gün Kaldı`,
      message: 'Abonelik yakında sona erecek.',
      remainingDays,
    };
  }

  if (isDemo) {
    return {
      key: 'demo',
      aktif: true,
      blocked: false,
      label: 'Demo Aktif',
      message: 'Demo abonelik aktif.',
      remainingDays,
    };
  }

  if (isActive) {
    return {
      key: 'active',
      aktif: true,
      blocked: false,
      label: 'Aktif',
      message: 'Abonelik aktif.',
      remainingDays,
    };
  }

  return {
    key: 'passive',
    aktif: false,
    blocked: true,
    label: 'Abonelik Pasif',
    message: 'Bu kurumun abonelik durumu pasif görünüyor.',
    remainingDays,
  };
}

export function shouldBlockForRole(role, subscription = {}) {
  if (role === 'superadmin') return false;
  const status = getSubscriptionStatus(subscription);
  return status.blocked;
}
