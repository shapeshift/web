export const semanticTokens = {
  colors: {
    background: {
      surface: {
        base: {
          default: 'white',
          _dark: 'darkNeutral.950',
        },
        hover: {
          default: 'gray.100',
          _dark: 'darkNeutral.800',
        },
        pressed: {
          default: 'gray.200',
          _dark: 'darkNeutral.700',
        },
        raised: {
          base: {
            default: 'gray.100',
            _dark: 'darkNeutralAlpha.800',
          },
          hover: {
            default: 'gray.200',
            _dark: 'darkNeutral.800',
          },
          pressed: {
            default: 'gray.300',
            _dark: 'darkNeutral.700',
          },
          accent: {
            default: 'white',
            _dark: 'darkNeutralAlpha.800',
          },
        },
        overlay: {
          base: {
            default: 'white',
            _dark: 'darkNeutral.800',
          },
        },
      },
      button: {
        secondary: {
          base: {
            default: 'gray.100',
            _dark: 'darkNeutralAlpha.700',
          },
          hover: {
            default: 'gray.200',
            _dark: 'darkNeutralAlpha.600',
          },
          pressed: {
            default: 'gray.300',
            _dark: 'darkNeutralAlpha.500',
          },
        },
      },
      input: {
        base: {
          default: 'gray.50',
          _dark: 'darkNeutral.750',
        },
        hover: {
          default: 'gray.100',
          _dark: 'darkNeutral.800',
        },
        pressed: {
          default: 'gray.200',
          _dark: 'darkNeutral.750',
        },
      },
    },

    border: {
      base: {
        default: 'gray.100',
        _dark: 'darkNeutralAlpha.700',
      },
      subtle: {
        default: 'gray.100',
        _dark: 'darkNeutralAlpha.800',
      },
      bold: {
        default: 'gray.300',
        _dark: 'darkNeutralAlpha.600',
      },
      hover: {
        default: 'gray.200',
        _dark: 'whiteAlpha.300',
      },
      pressed: {
        default: 'gray.300',
        _dark: 'whiteAlpha.400',
      },
    },
    text: {
      base: {
        default: 'black',
        _dark: 'white',
      },
      subtle: {
        default: 'gray.500',
        _dark: 'darkNeutral.300',
      },
      subtlest: {
        default: 'gray.400',
        _dark: 'darkNetural.400',
      },
    },
  },
}
