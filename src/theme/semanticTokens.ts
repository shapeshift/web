export const semanticTokens = {
  colors: {
    background: {
      surface: {
        base: {
          default: 'white',
          _dark: 'darkNeutral.950',
        },
        alpha: {
          default: 'rgba(255, 255, 255, .8)',
          _dark: 'rgba(16, 17, 20, 0.8)',
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
            default: 'gray.50',
            _dark: 'darkNeutralAlpha.800',
          },
          hover: {
            default: 'gray.200',
            _dark: 'darkNeutralAlpha.500',
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
            _dark: 'darkNeutral.750',
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
          default: 'gray.100',
          _dark: 'darkNeutral.900',
        },
        hover: {
          default: 'gray.150',
          _dark: 'darkNeutral.800',
        },
        pressed: {
          default: 'gray.250',
          _dark: 'darkNeutral.900',
        },
      },
      success: {
        default: 'green.50',
        _dark: 'rgba(92, 223, 189, 0.20)',
      },
      error: {
        default: 'red.50',
        _dark: 'rgba(254, 178, 178, 0.2)',
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
      focused: {
        default: 'blue.500',
        _dark: 'blue.200',
      },
      error: {
        default: 'red.500',
        _dark: 'red.300',
      },
      info: {
        default: 'blue.500',
        _dark: 'blue.200',
      },
      warning: {
        default: 'orange.500',
        _dark: 'orange.200',
      },
      success: {
        default: 'green.500',
        _dark: 'green.200',
      },
      input: {
        default: 'gray.100',
        _dark: 'darkNeutralAlpha.500',
      },
    },
    text: {
      base: {
        default: 'black',
        _dark: 'white',
      },
      link: {
        default: 'blue.500',
        _dark: 'blue.200',
      },
      subtle: {
        default: 'gray.500',
        _dark: 'darkNeutral.300',
      },
      subtlest: {
        default: 'gray.400',
        _dark: 'darkNeutralAlpha.400',
      },
      info: {
        default: 'blue.500',
        _dark: 'blue.200',
      },
      success: {
        default: 'green.500',
        _dark: 'green.400',
      },
      error: {
        default: 'red.500',
        _dark: 'red.400',
      },
      warning: {
        default: 'orange.500',
        _dark: 'orange.200',
      },
    },
    blanket: {
      default: '#10121499',
      _dark: 'darkNeutralAlpha.950',
    },
  },
}
