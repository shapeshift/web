export const semanticTokens = {
  colors: {
    background: {
      surface: {
        base: {
          default: 'white',
          _dark: 'DarkNeutral.950',
        },
        hover: {
          default: 'gray.100',
          _dark: 'DarkNeutral.800',
        },
        pressed: {
          default: 'gray.200',
          _dark: 'DarkNeutral.700',
        },
        raised: {
          base: {
            default: 'gray.100',
            _dark: 'DarkNeutral.900',
          },
          hover: {
            default: 'gray.200',
            _dark: 'DarkNeutral.800',
          },
          pressed: {
            default: 'gray.300',
            _dark: 'DarkNeutral.700',
          },
          accent: {
            default: 'white',
            _dark: 'DarkNeutral.800',
          },
        },
        overlay: {
          base: {
            default: 'white',
            _dark: 'DarkNeutral.700',
          },
        },
      },
      button: {
        secondary: {
          base: {
            default: 'gray.100',
            _dark: 'whiteAlpha.200',
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
      },
      input: {
        base: {
          default: 'gray.50',
          _dark: 'DarkNeutral.750',
        },
        hover: {
          default: 'gray.100',
          _dark: 'DarkNeutral.800',
        },
        pressed: {
          default: 'gray.200',
          _dark: 'DarkNeutral.750',
        },
      },
    },

    border: {
      base: {
        default: 'gray.100',
        _dark: 'whiteAlpha.200',
      },
      subtle: {
        default: 'gray.100',
        _dark: 'whiteAlpha.100',
      },
      bold: {
        default: 'gray.300',
        _dark: 'whiteAlpha.300',
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
        _dark: '#70737B',
      },
    },
  },
}
