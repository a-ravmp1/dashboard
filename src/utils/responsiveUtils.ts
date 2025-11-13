export const getResponsiveFontSize = (width: number, baseSize: number = 16): string => {
  if (width < 150) {
    return `${Math.max(12, baseSize * 0.6)}px`;
  } else if (width < 200) {
    return `${Math.max(14, baseSize * 0.75)}px`;
  } else if (width < 300) {
    return `${Math.max(16, baseSize * 0.9)}px`;
  } else if (width < 400) {
    return `${baseSize}px`;
  } else {
    return `${Math.min(baseSize * 1.2, 48)}px`;
  }
};

export const getResponsivePadding = (width: number): number => {
  if (width < 150) return 8;
  if (width < 250) return 12;
  return 16;
};

export const getResponsiveGap = (width: number): number => {
  if (width < 150) return 8;
  if (width < 250) return 12;
  return 16;
};
