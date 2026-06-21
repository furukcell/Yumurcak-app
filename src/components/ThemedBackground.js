import React from 'react';
import { View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

export default function ThemedBackground(props) {
  const themeData = useAppTheme();
  const theme = themeData.theme;
  return React.createElement(
    View,
    { style: [{ flex: 1, backgroundColor: theme.bg, overflow: 'hidden' }, props.style] },
    props.children
  );
}
