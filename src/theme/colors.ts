const commonColors = {
  blue: {
    50: '#E8DECB',
    100: '#E8DECB',
    200: '#E8DECB',
    300: '#E0D1B7',
    400: '#E0D1B7',
    500: '#B89B68',
    600: '#B89B68',
    700: '#B89B68',
    800: '#B89B68',
    900: '#B89B68',
  },
  gray: {
    900: '#121212',
    850: '#121212',
    825: '#121212',
    815: '#121212',
    800: '#121212',
    785: '#121212',
    750: '#343434',
    700: '#343434',
    600: '#737373',
    500: '#718096',
    400: '#A0AEC0',
    300: '#CBD5E0',
    200: '#E2E8F0',
    100: '#EDF2F7',
    50: '#F7FAFC',
  },
  green: {
    900: '#004F3A',
    800: '#00684D',
    700: '#008562',
    600: '#00A67B',
    500: '#00CD98',
    400: '#16D1A1',
    300: '#33D7AD',
    200: '#5CDFBD',
    100: '#A1ECD9',
    50: '#E6FAF5',
  },
  red: {
    50: '#FFF5F5',
    100: '#FFF8F8',
    200: '#FDE3E3',
    300: '#FAC1C0',
    400: '#F5918F',
    500: '#EF5350',
    600: '#DD4D4A',
    700: '#C74543',
    800: '#AE3C3B',
    900: '#923231',
  },
  darkTeal: {
    500: '#144241',
    300: '#3F6D6C',
  },
}

export const brand = {
  primary: commonColors.blue[500],
  altBg: `radial-gradient(94.32% 94.6% at 4.04% -44.6%,${commonColors.blue[600]}66 0%,${commonColors.gray[900]}00 100%),linear-gradient(0deg,${commonColors.gray[900]},${commonColors.gray[900]})`,
}

export const colors = {
  ...commonColors,
  ...brand,
}
