import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onValue, ref, update } from 'firebase/database';
import { database } from '../config/firebase';
import { DEFAULT_THEME_ID, getThemeById } from './themes';

const Ctx = createContext(null);

export function ThemeProvider(props) {
  const children = props.children;
  const kresId = props.kresId;
  const state1 = useState(DEFAULT_THEME_ID);
  const themeId = state1[0];
  const setThemeId = state1[1];
  const state2 = useState(true);
  const patternEnabled = state2[0];
  const setPatternEnabled = state2[1];
  const state3 = useState(true);
  const loadingTheme = state3[0];
  const setLoadingTheme = state3[1];

  useEffect(function () {
    if (!kresId) {
      setThemeId(DEFAULT_THEME_ID);
      setPatternEnabled(true);
      setLoadingTheme(false);
      return undefined;
    }
    const unsub = onValue(ref(database, 'kresler/' + kresId), function (snap) {
      const data = snap.val() || {};
      const ayar = data.temaAyarlari || data.ayarlar || {};
      setThemeId(ayar.temaId || data.temaId || DEFAULT_THEME_ID);
      setPatternEnabled(ayar.patternEnabled !== false);
      setLoadingTheme(false);
    }, function () {
      setThemeId(DEFAULT_THEME_ID);
      setPatternEnabled(true);
      setLoadingTheme(false);
    });
    return function () { unsub(); };
  }, [kresId]);

  const theme = useMemo(function () {
    const t = getThemeById(themeId);
    return Object.assign({}, t, { patternEnabled: Boolean(patternEnabled && t.patternEnabled) });
  }, [themeId, patternEnabled]);

  function saveSchoolTheme(nextThemeId, nextPatternEnabled) {
    if (!kresId) return Promise.resolve(false);
    return update(ref(database, 'kresler/' + kresId), {
      temaId: nextThemeId,
      temaAyarlari: { temaId: nextThemeId, patternEnabled: nextPatternEnabled !== false, updatedAt: Date.now() },
    });
  }

  return React.createElement(Ctx.Provider, { value: { theme: theme, themeId: themeId, patternEnabled: patternEnabled, loadingTheme: loadingTheme, saveSchoolTheme: saveSchoolTheme } }, children);
}

export function useAppTheme() {
  return useContext(Ctx) || {
    theme: getThemeById(DEFAULT_THEME_ID),
    themeId: DEFAULT_THEME_ID,
    patternEnabled: true,
    loadingTheme: false,
    saveSchoolTheme: function () { return Promise.resolve(false); },
  };
}
