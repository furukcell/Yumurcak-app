import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

export default function ThemePatternBackground({ opacity }) {
  const { theme } = useAppTheme();
  if (theme?.patternEnabled === false || !theme?.backgroundImage) return null;

  const imageOpacity = typeof opacity === 'number'
    ? opacity
    : (typeof theme?.patternOpacity === 'number' ? theme.patternOpacity : 0.2);

  return (
    <ImageBackground
      pointerEvents="none"
      source={theme.backgroundImage}
      resizeMode="cover"
      style={styles.wrap}
      imageStyle={[styles.image, { opacity: imageOpacity }]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  image: {
    opacity: 0.2,
  },
});
