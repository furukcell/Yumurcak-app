import { AppState } from 'react-native';
import { push, ref, serverTimestamp, set } from 'firebase/database';
import { database } from '../config/firebase';

let currentUser = null;
let lastScreenKey = '';
let lastScreenAt = 0;
let foregroundTimer = null;
let appStateSubscription = null;

const SCREEN_DEBOUNCE_MS = 1500;

function clean(value, fallback = '') {
  return String(value ?? fallback).trim().slice(0, 120);
}

function getUserId() {
  return currentUser?.id || currentUser?.uid || '';
}

function getKresId() {
  return currentUser?.kresId || currentUser?.kres || '';
}

function getRole() {
  return currentUser?.rol || currentUser?.role || '';
}

function moduleFromRoute(routeName = '') {
  const route = clean(routeName, 'Bilinmeyen');
  const normalized = route.toLocaleLowerCase('tr-TR');

  const groups = [
    ['yoklama', 'Yoklama'],
    ['gunluk', 'Günlük Takip'],
    ['yemek', 'Yemek'],
    ['duyuru', 'Duyurular'],
    ['galeri', 'Galeri'],
    ['gelisim', 'Gelişim'],
    ['medikal', 'Sağlık / Medikal'],
    ['ilac', 'İlaç Takibi'],
    ['etkinlik', 'Etkinlik'],
    ['anket', 'Anket'],
    ['mesaj', 'Mesajlaşma'],
    ['sohbet', 'Mesajlaşma'],
    ['servis', 'Servis'],
    ['ders', 'Ders Programı'],
    ['nobet', 'Nöbet'],
    ['personel', 'Personel'],
    ['dokuman', 'Dokümanlar'],
    ['bulten', 'Bülten'],
    ['ayar', 'Ayarlar'],
    ['profil', 'Profil'],
    ['ana', 'Ana Sayfa'],
    ['home', 'Ana Sayfa'],
    ['dashboard', 'Dashboard'],
  ];

  const match = groups.find(([needle]) => normalized.includes(needle));
  return match ? match[1] : route;
}

export function setUsageUser(user) {
  currentUser = user || null;
}

export async function trackUsage({ action = 'event', module = '', screen = '', metadata = {} } = {}) {
  const userId = getUserId();
  const kresId = getKresId();
  if (!userId || !kresId) return;

  try {
    const eventRef = push(ref(database, 'kullanimLoglari'));
    await set(eventRef, {
      kullaniciId: clean(userId),
      kresId: clean(kresId),
      rol: clean(getRole()),
      kullaniciAdi: clean(currentUser?.adSoyad || currentUser?.ad || currentUser?.kullaniciAdi || ''),
      action: clean(action, 'event'),
      islem: clean(action, 'event'),
      module: clean(module),
      modul: clean(module),
      screen: clean(screen),
      ...metadata,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // Analytics must never block or crash the application.
    console.warn('Kullanım analitiği kaydedilemedi:', error?.message || error);
  }
}

export function trackScreen(routeName) {
  const screen = clean(routeName, 'Bilinmeyen');
  const now = Date.now();
  const key = `${getUserId()}:${screen}`;
  if (key === lastScreenKey && now - lastScreenAt < SCREEN_DEBOUNCE_MS) return;

  lastScreenKey = key;
  lastScreenAt = now;
  trackUsage({
    action: 'screen_view',
    module: moduleFromRoute(screen),
    screen,
  });
}

export function trackLogin() {
  trackUsage({ action: 'login', module: 'Oturum', screen: 'Login' });
}

export function trackLogout() {
  trackUsage({ action: 'logout', module: 'Oturum', screen: 'Logout' });
}

export function startUsageTracking(user) {
  setUsageUser(user);
  if (appStateSubscription) return () => {};

  const onActive = () => {
    if (foregroundTimer) clearTimeout(foregroundTimer);
    foregroundTimer = setTimeout(() => {
      trackUsage({ action: 'app_open', module: 'Oturum', screen: 'App' });
    }, 0);
  };

  onActive();
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') onActive();
  });

  return () => {
    if (foregroundTimer) clearTimeout(foregroundTimer);
    foregroundTimer = null;
    appStateSubscription?.remove?.();
    appStateSubscription = null;
    currentUser = null;
    lastScreenKey = '';
    lastScreenAt = 0;
  };
}

export function stopUsageTracking() {
  if (foregroundTimer) clearTimeout(foregroundTimer);
  foregroundTimer = null;
  appStateSubscription?.remove?.();
  appStateSubscription = null;
  currentUser = null;
  lastScreenKey = '';
  lastScreenAt = 0;
}
