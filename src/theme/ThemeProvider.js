import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onValue, ref, update } from 'firebase/database';
import { database } from '../config/firebase';
import { DEFAULT_THEME_ID, getThemeById } from './themes';

const Ctx = createContext(null);

export function ThemeProvider(props) {
  const children = props.children;
  const kresId = props.kresId;
  const classThemeSinifId = props.classThemeSinifId || null;
  const userId = props.userId || null;
 

  const state1 = useState(DEFAULT_THEME_ID);
  const themeId = state1[0];
  const setThemeId = state1[1];

  const state2 = useState(true);
  const patternEnabled = state2[0];
  const setPatternEnabled = state2[1];

  const state3 = useState(true);
  const loadingTheme = state3[0];
  const setLoadingTheme = state3[1];
  const state4 = useState(null);
  const classThemeId = state4[0];
  const setClassThemeId = state4[1];


  useEffect(function () {
    if (!kresId) {
      setThemeId(DEFAULT_THEME_ID);
      setPatternEnabled(true);
      setClassThemeId(null);
      setLoadingTheme(false);
      return undefined;
    }

    const unsub = onValue(ref(database, 'kresler/' + kresId), function (snap) {
      const data = snap.val() || {};
      const schoolSettings = data.temaAyarlari || data.ayarlar || {};
      const classSettings =
        classThemeSinifId && data.sinifTemalari
          ? data.sinifTemalari[classThemeSinifId]
          : null;

      const hasClassTheme = !!classSettings?.temaId;

      setThemeId(
        hasClassTheme
          ? classSettings.temaId
          : schoolSettings.temaId || data.temaId || DEFAULT_THEME_ID
      );

      setPatternEnabled(
        hasClassTheme
          ? classSettings.patternEnabled !== false
          : schoolSettings.patternEnabled !== false
      );

      setClassThemeId(hasClassTheme ? classSettings.temaId : null);
      setLoadingTheme(false);
    }, function () {
      setThemeId(DEFAULT_THEME_ID);
      setPatternEnabled(true);
      setClassThemeId(null);
      setLoadingTheme(false);
    });

    return function () { unsub(); };
  }, [kresId, classThemeSinifId]);

  const theme = useMemo(function () {
    const t = getThemeById(themeId);
    return Object.assign({}, t, {
      patternEnabled: Boolean(patternEnabled && t.patternEnabled),
    });
  }, [themeId, patternEnabled]);

  function saveSchoolTheme(nextThemeId, nextPatternEnabled) {
    if (!kresId) return Promise.resolve(false);

    return update(ref(database, 'kresler/' + kresId), {
      temaId: nextThemeId,
      temaAyarlari: {
        temaId: nextThemeId,
        patternEnabled: nextPatternEnabled !== false,
        updatedAt: Date.now(),
      },
    });
  }

  function saveClassTheme(sinifId, nextThemeId, nextPatternEnabled) {
    if (!kresId || !sinifId) return Promise.resolve(false);

    return update(ref(database, 'kresler/' + kresId + '/sinifTemalari/' + sinifId), {
      temaId: nextThemeId,
      patternEnabled: nextPatternEnabled !== false,
      updatedAt: Date.now(),
      updatedBy: userId,
    });
  }

  return React.createElement(
    Ctx.Provider,
    {
      value: {
        theme: theme,
        themeId: themeId,
        classThemeId: classThemeId,
        classThemeSinifId: classThemeSinifId,
        patternEnabled: patternEnabled,
        loadingTheme: loadingTheme,
        saveSchoolTheme: saveSchoolTheme,
        saveClassTheme: saveClassTheme,
      },
    },
    children
  );
}

export function useAppTheme() {
  return useContext(Ctx) || {
    theme: getThemeById(DEFAULT_THEME_ID),
    themeId: DEFAULT_THEME_ID,
    classThemeId: null,
    classThemeSinifId: null,
    patternEnabled: true,
    loadingTheme: false,
    saveSchoolTheme: function () { return Promise.resolve(false); },
    saveClassTheme: function () { return Promise.resolve(false); },
  };
}
