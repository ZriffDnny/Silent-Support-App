export const colors = {
  canvas: '#0E0F1A',
  surface: '#171928',
  surfaceHigh: '#1F2236',
  comfortBase: '#0A0C16',

  inkPrimary: '#E8E5DC',
  inkSecondary: '#9C9AAB',
  inkTertiary: '#81818F', // lifted from #5E5D6F so it clears 4.5:1 on canvas and surface

  accentWhisper: '#7C8BB3',
  accentWarm: '#C4A78F',
  accentAlert: '#A87B7B',
} as const;

export type ColorToken = keyof typeof colors;
