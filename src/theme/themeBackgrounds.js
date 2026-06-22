export const themeBackgrounds = {
  butterfly: require('../../assets/theme-backgrounds/butterfly.png'),
  forest: require('../../assets/theme-backgrounds/forest.png'),
  coral: require('../../assets/theme-backgrounds/coral.png'),
  farm: require('../../assets/theme-backgrounds/farm.png'),
  sky: require('../../assets/theme-backgrounds/sky.png'),
  honey: require('../../assets/theme-backgrounds/honey.png'),
  dino: require('../../assets/theme-backgrounds/dino.png'),
  ocean: require('../../assets/theme-backgrounds/ocean.png'),
  candy: require('../../assets/theme-backgrounds/candy.png'),
  space: require('../../assets/theme-backgrounds/space.png'),
};

export function getThemeBackground(key) {
  return themeBackgrounds[key] || themeBackgrounds.butterfly;
}
