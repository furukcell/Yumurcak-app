import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onValue, ref } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from './AuthContext';

const ParentChildContext = createContext(null);

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function includesId(value, id) {
  if (!id) return false;
  if (Array.isArray(value)) return value.map(String).includes(String(id));
  if (value && typeof value === 'object') return Object.keys(value).map(String).includes(String(id));
  return String(value || '') === String(id);
}

export function ParentChildProvider({ children: appChildren }) {
  const { kullanici } = useAuth();
  const parentId = kullanici?.uid || kullanici?.id;
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const storageKey = parentId ? `@yumurcak/selected-parent-child/${parentId}` : null;

  useEffect(() => {
    let active = true;
    if (!storageKey) {
      setSelectedChildId(null);
      setHydrated(true);
      return undefined;
    }
    setHydrated(false);
    AsyncStorage.getItem(storageKey)
      .then((value) => { if (active) setSelectedChildId(value || null); })
      .catch(() => {})
      .finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, [storageKey]);

  useEffect(() => {
    if (!parentId) {
      setChildren([]);
      return undefined;
    }

    let fallbackUnsub = null;
    let scopedUnsubs = [];
    let usingFallback = false;
    const cleanupScoped = () => { scopedUnsubs.forEach((unsub) => unsub && unsub()); scopedUnsubs = []; };
    const cleanupFallback = () => { if (fallbackUnsub) fallbackUnsub(); fallbackUnsub = null; usingFallback = false; };
    const startFallback = () => {
      cleanupScoped();
      if (usingFallback) return;
      usingFallback = true;
      fallbackUnsub = onValue(ref(database, 'cocuklar'), (snap) => {
        const data = snap.val();
        const mine = [];
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([id, raw]) => {
            const child = safeObject(raw);
            if (includesId(child.veliIds, parentId) || child.veliId === parentId || child.parentId === parentId) mine.push({ id, ...child });
          });
        }
        mine.sort((a, b) => `${a.ad || a.adSoyad || a.isim || ''}`.localeCompare(`${b.ad || b.adSoyad || b.isim || ''}`, 'tr'));
        setChildren(mine);
      }, () => setChildren([]));
    };

    const indexUnsub = onValue(ref(database, `veliCocuklari/${parentId}`), (snap) => {
      const index = snap.val();
      const ids = index && typeof index === 'object'
        ? Object.entries(index).filter(([, value]) => value !== false && value !== null).map(([id]) => id)
        : [];
      if (!ids.length) { startFallback(); return; }
      cleanupFallback();
      cleanupScoped();
      const childMap = {};
      let loaded = 0;
      const publish = () => setChildren(ids.map((id) => childMap[id]).filter(Boolean));
      ids.forEach((childId) => {
        const unsub = onValue(ref(database, `cocuklar/${childId}`), (childSnap) => {
          const child = safeObject(childSnap.val());
          if (Object.keys(child).length) childMap[childId] = { id: childId, ...child };
          else delete childMap[childId];
          loaded += 1;
          if (loaded >= ids.length) publish(); else setChildren(Object.values(childMap));
        }, () => {
          loaded += 1;
          delete childMap[childId];
          if (loaded >= ids.length) publish();
        });
        scopedUnsubs.push(unsub);
      });
    }, startFallback);

    return () => { indexUnsub && indexUnsub(); cleanupScoped(); cleanupFallback(); };
  }, [parentId]);

  const selectedChild = useMemo(() => {
    if (!children.length) return null;
    return children.find((child) => String(child.id) === String(selectedChildId)) || children[0];
  }, [children, selectedChildId]);

  useEffect(() => {
    if (!hydrated || !selectedChild?.id || !storageKey) return;
    const id = String(selectedChild.id);
    if (id !== String(selectedChildId || '')) setSelectedChildId(id);
    AsyncStorage.setItem(storageKey, id).catch(() => {});
  }, [hydrated, selectedChild, selectedChildId, storageKey]);

  const selectChild = useCallback((childId) => {
    if (!childId) return;
    const id = String(childId);
    setSelectedChildId(id);
    if (storageKey) AsyncStorage.setItem(storageKey, id).catch(() => {});
  }, [storageKey]);

  const value = useMemo(() => ({ children, selectedChild, selectedChildId: selectedChild?.id || null, selectChild }), [children, selectedChild, selectChild]);
  return <ParentChildContext.Provider value={value}>{appChildren}</ParentChildContext.Provider>;
}

export function useParentChild() {
  const context = useContext(ParentChildContext);
  if (!context) throw new Error('useParentChild must be used inside ParentChildProvider');
  return context;
}
