import React, { createContext, useContext, useMemo, useState } from 'react';
import { DEFAULT_THEME_ID, getThemeById } from './themes';

const AppThemeContext = createContext(null);

export function ThemeProvider(props) {
  const children = props.children;
  const themeIdState = useState(DEFAULT_THEME_ID);
  const themeId = themeIdState[0];
  const theme = useMemo(function () { return getThemeById(themeId); }, [themeId]);
  return React.createElement(AppThemeContext.Provider, { value: { theme: theme, themeId: themeId } }, children);
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) return { theme: getThemeById(DEFAULT_THEME_ID), themeId: DEFAULT_THEME_ID };
  return context;
}
