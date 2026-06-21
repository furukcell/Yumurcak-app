import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

const ICON_CODES = {
  animal: [0x1f43b, 0x1f430, 0x1f98a, 0x1f308, 0x2b50],
  forest: [0x1f33f, 0x1f98a, 0x1f43b, 0x1f343, 0x2b50],
  ocean: [0x1f420, 0x1f419, 0x1f42c, 0x1f30a, 0x2b50],
  farm: [0x1f42e, 0x1f414, 0x1f33f, 0x1f33b, 0x2b50],
  sky: [0x2601, 0x1f308, 0x2b50, 0x2600, 0x2728],
  honey: [0x1f41d, 0x1f36f, 0x1f33c, 0x2b50, 0x1f33f],
  dino: [0x1f995, 0x1f996, 0x1f33f, 0x2b50, 0x1f30b],
  candy: [0x1f36d, 0x1f9c1, 0x2b50, 0x1f308, 0x1f496],
  space: [0x1f680, 0x1fa90, 0x2b50, 0x1f319, 0x1f47e],
};

const POSITIONS = [
  { top: 82, left: -12, rotate: '-18deg' },
  { top: 145, right: 14, rotate: '16deg' },
  { top: 322, left: 12, rotate: '10deg' },
  { top: 495, right: -14, rotate: '-12deg' },
  { top: 660, left: 24, rotate: '18deg' },
];

function getIcons(type) {
  const codes = ICON_CODES[type] || ICON_CODES.animal;
  return codes.map((code) => String.fromCodePoint(code));
}

export default function ThemePatternOverlay({ opacity = 0.28 }) {
  const { theme } = useAppTheme();
  if (theme?.patternEnabled === false) return null;

  const icons = getIcons(theme?.patternType);

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {POSITIONS.map((position, index) => (
        <Text
          key={`${index}-${theme?.patternType || 'animal'}`}
          style={[
            styles.icon,
            position,
            { opacity, transform: [{ rotate: position.rotate }] },
          ]}
        >
          {icons[index]}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
  },
  icon: {
    position: 'absolute',
    fontSize: 58,
  },
});