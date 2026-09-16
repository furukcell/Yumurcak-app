import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@yumurcak/selected-parent-child';
const ParentChildContext = createContext(null);

export function ParentChildProvider({ children, childList = [] }) {
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (active && value) setSelectedChildId(value);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => { active = false; };
  }, []);

  const selectedChild = useMemo(() => {
    if (!childList.length) return null;
    const selected = childList.find((child) => String(child.id) === String(selectedChildId));
    return selected || childList[0];
  }, [childList, selectedChildId]);

  useEffect(() => {
    if (!hydrated || !selectedChild?.id) return;
    const id = String(selectedChild.id);
    if (id !== String(selectedChildId || '')) setSelectedChildId(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, [hydrated, selectedChild, selectedChildId]);

  const selectChild = useCallback((childId) => {
    if (!childId) return;
    const id = String(childId);
    setSelectedChildId(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const value = useMemo(() => ({
    children: childList,
    selectedChild,
    selectedChildId: selectedChild?.id || null,
    selectChild,
  }), [childList, selectedChild, selectChild]);

  return <ParentChildContext.Provider value={value}>{children}</ParentChildContext.Provider>;
}

export function useParentChild() {
  const context = useContext(ParentChildContext);
  if (!context) throw new Error('useParentChild must be used inside ParentChildProvider');
  return context;
}
