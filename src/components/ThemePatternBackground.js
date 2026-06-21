import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

const PATTERN_ICONS = {
  animal: ['🐻', '🐰', '🦊', '🌈', '⭐'],
  forest: ['🌿', '🦊', '🐻', '🍃', '⭐'],
  ocean: ['🐠', '🐙', '🐬', '🌊', '⭐'],
  farm: ['🐮', '🐔', '🌿', '🌻', '⭐'],
  sky: ['☁️', '🌈', '⭐', '🪁', '☀️'],
  honey: ['🐝', '🍯', '🌼', '⭐', '🌿'],
  dino: ['🦕', '🦖', '🌿', '⭐', '🌋'],
  candy: ['🍭', '🧁', '⭐', '🌈', '💖'],
  space: ['🚀', '🪐', '⭐', '🌙', '👾'],
};

const POSITIONS = [
  { top: 88, left: -8, rotate: '-18deg' },
  { top: 148, right: 18, rotate: '16deg' },
  { top: 330, left: 18, rotate: '10deg' },
  { top: 500, right: -10, rotate: '-12deg' },
  { top: 665, left: 26, rotate: '18deg' },
];

function getIcons(theme) {
  const key = theme?.patternType || 'animal';
  return PATTERN_ICONS[key] || PATTERN_ICONS.animal;
}

export default function ThemePatternBackground({ opacity = 0.12 }) {
  const { theme } = useAppTheme();
  if (theme?.patternEnabled === false) return null;

  const icons = getIcons(theme);

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {POSITIONS.map((pos, index) => (
        <Text
          key={`${icons[index]}-${index}`}
          style={[
            styles.icon,
            pos,
            {
              opacity,
              transform: [{ rotate: pos.rotate }],
            },
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
    zIndex: 0,
  },
  icon: {
    position: 'absolute',
    fontSize: 54,
  },
});
