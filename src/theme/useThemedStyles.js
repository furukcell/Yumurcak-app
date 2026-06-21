import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useAppTheme } from './ThemeProvider';

export function useThemedStyles(factory) {
  const { theme } = useAppTheme();
  const styles = useMemo(function () {
    return StyleSheet.create(factory(theme));
  }, [factory, theme]);
  return { theme: theme, styles: styles };
}

export function themedCard(theme) {
  return {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
  };
}
