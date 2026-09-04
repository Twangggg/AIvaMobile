export const palette = {
  navy: {
    DEFAULT: '#00236f',
    container: '#1e3a8a',
    soft: '#4059aa',
    fixed: '#dce1ff',
    fixedDim: '#b6c4ff',
    onFixed: '#00164e',
    onContainer: '#90a8ff',
  },
  amber: {
    DEFAULT: '#fea619',
    deep: '#855300',
    on: '#684000',
    fixed: '#ffddb8',
    fixedDim: '#ffb95f',
  },
  green: {
    DEFAULT: '#27c38a',
    deep: '#004a31',
    container: '#004a31',
    fixed: '#6ffbbe',
  },
  slate: {
    background: '#f7f9fb',
    surface: '#f7f9fb',
    low: '#f2f4f6',
    container: '#eceef0',
    high: '#e6e8ea',
    highest: '#e0e3e5',
    dim: '#d8dadc',
    outline: '#757682',
    outlineVariant: '#c5c5d3',
    onSurface: '#191c1e',
    onVariant: '#444651',
  },
  rose: {
    DEFAULT: '#ba1a1a',
    container: '#ffdad6',
    onContainer: '#93000a',
  },
  white: '#ffffff',
  black: '#000000',
};

export const alpha = (hex: string, opacity: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
