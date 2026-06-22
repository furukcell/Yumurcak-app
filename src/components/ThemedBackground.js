import React from 'react';
import { ImageBackground, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

export default function ThemedBackground(props) {
  const { theme } = useAppTheme();
  const backgroundImage = theme?.patternEnabled === false ? null : theme?.backgroundImage;
  const imageOpacity = typeof theme?.patternOpacity === 'number' ? theme.patternOpacity : 0.85;

  if (!backgroundImage) {
    return React.createElement(
      View,
      { style: [{ flex: 1, backgroundColor: theme.bg, overflow: 'hidden' }, props.style] },
      props.children
    );
  }

  return React.createElement(
    ImageBackground,
    {
      source: backgroundImage,
      resizeMode: 'cover',
      style: [styles.background, { backgroundColor: theme.bg }, props.style],
      imageStyle: [styles.image, { opacity: imageOpacity }],
    },
    React.createElement(View, { style: styles.content }, props.children)
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    overflow: 'hidden',
  },
  image: {
    opacity: 0.85,
  },
  content: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
