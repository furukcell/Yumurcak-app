// ============================================================
// YUMURCAK — revenueCat.js
// RevenueCat Android altyapısı
// ============================================================
import Purchases from 'react-native-purchases';

export const REVENUECAT_ANDROID_PUBLIC_KEY = 'goog_WqntzZwxdOpqOYBOtuKyYaMwfIg';
export const REVENUECAT_OFFERING_ID = 'default';
export const REVENUECAT_ENTITLEMENT_ID = 'YUMURCAK Pro';

let configuredAppUserId = null;

function normalizeUserId(appUserId) {
  return String(appUserId || 'anonymous').trim() || 'anonymous';
}

export async function configureRevenueCat(appUserId) {
  const normalizedId = normalizeUserId(appUserId);

  if (configuredAppUserId === normalizedId) return true;

  try {
    if (Purchases?.LOG_LEVEL?.ERROR && Purchases?.setLogLevel) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.ERROR);
    }

    await Purchases.configure({
      apiKey: REVENUECAT_ANDROID_PUBLIC_KEY,
      appUserID: normalizedId,
    });

    configuredAppUserId = normalizedId;
    return true;
  } catch (error) {
    console.warn('RevenueCat configure hatası:', error);
    return false;
  }
}

export async function getRevenueCatPackages(appUserId) {
  const configured = await configureRevenueCat(appUserId);
  if (!configured) {
    return {
      ready: false,
      monthly: null,
      yearly: null,
      offering: null,
      error: 'RevenueCat yapılandırılamadı.',
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings?.all?.[REVENUECAT_OFFERING_ID] || offerings?.current || null;
    const packages = offering?.availablePackages || [];

    const monthly = packages.find((item) => item.identifier === 'monthly' || item.packageType === 'MONTHLY') || null;
    const yearly = packages.find((item) => item.identifier === 'yearly' || item.packageType === 'ANNUAL') || null;

    return {
      ready: !!offering,
      monthly,
      yearly,
      offering,
      error: offering ? '' : 'RevenueCat offering bulunamadı.',
    };
  } catch (error) {
    console.warn('RevenueCat offering okuma hatası:', error);
    return {
      ready: false,
      monthly: null,
      yearly: null,
      offering: null,
      error: 'RevenueCat ürünleri henüz okunamadı.',
    };
  }
}

export async function purchaseRevenueCatPackage(revenueCatPackage, appUserId) {
  if (!revenueCatPackage) throw new Error('RevenueCat paketi bulunamadı.');
  const configured = await configureRevenueCat(appUserId);
  if (!configured) throw new Error('RevenueCat yapılandırılamadı.');

  return Purchases.purchasePackage(revenueCatPackage);
}

export async function restoreRevenueCatPurchases(appUserId) {
  const configured = await configureRevenueCat(appUserId);
  if (!configured) throw new Error('RevenueCat yapılandırılamadı.');

  return Purchases.restorePurchases();
}

export function getActiveRevenueCatEntitlement(customerInfo) {
  const activeEntitlements = customerInfo?.entitlements?.active || {};
  return activeEntitlements[REVENUECAT_ENTITLEMENT_ID] || null;
}

export function isRevenueCatPremiumActive(customerInfo) {
  return !!getActiveRevenueCatEntitlement(customerInfo);
}

export function getRevenueCatExpiryDate(customerInfo) {
  const entitlement = getActiveRevenueCatEntitlement(customerInfo);
  const rawDate = entitlement?.expirationDate || entitlement?.expirationDateMillis || null;

  if (!rawDate) return '';

  if (typeof rawDate === 'number') {
    return new Date(rawDate).toISOString().split('T')[0];
  }

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}
