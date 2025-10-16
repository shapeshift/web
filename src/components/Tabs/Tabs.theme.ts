import { mode } from '@chakra-ui/theme-tools'

export const TabsStyle = {
  parts: ['tab', 'tablist'],
  // Styles for the base style
  baseStyle: {},
  // Styles for the size variations
  sizes: {
    sm: {
      tablist: {
        paddingLeft: 6,
        paddingRight: 6,
      },
      tab: {
        borderRadius: 'full',
        paddingTop: 2,
        paddingBottom: 2,
      },
    },
  },
  // Styles for the visual style variations
  variants: {
    line: {
      tablist: {
        gap: 6,
      },
      tab: {
        px: 0,
      },
    },
    enclosed: (props: Record<string, any>) => ({
      tablist: {
        borerColor: 'border.base',
        borderBottomWidth: 0,
        'button:first-of-type': {
          borderLeftWidth: 0,
          borderTopRightRadius: 0,
          borderTopLeftRadius: 'xl',
        },
        'button:last-of-type': {
          borderRightWidth: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 'xl',
        },
      },
      tab: {
        py: 4,
        fontWeight: 'bold',
        marginBottom: '1px',
        borderColor: 'border.base',
        bg: 'transparent',
        color: 'text.subtle',
        _hover: {
          color: mode('black', 'white')(props),
        },
        _selected: {
          bg: 'background.surface.raised.base',
          borderBottomColor: 'transparent',
          borderColor: 'border.base',
          color: mode('black', 'white')(props),
        },
      },
    }),
    'enclosed-colored': (props: Record<string, any>) => ({
      tab: {
        bg: mode('gray.50', 'gray.750')(props),
        py: 4,
        color: 'text.subtle',
        fontWeight: 'bold',
        _first: {
          borderTopLeftRadius: '2xl',
        },
        _last: {
          borderTopRightRadius: '2xl',
        },
        border: 'none',
        _hover: {
          bg: mode('gray.100', 'gray.900')(props),
        },
        _selected: {
          bg: mode('white', 'gray.785')(props),
          color: mode('gray.800', 'white')(props),
        },
      },
    }),
    'soft-rounded': (props: Record<string, any>) => ({
      tab: {
        borderRadius: 'full',
        color: 'text.base',
        bg: 'background.button.secondary.base',
        _hover: {
          color: mode('gray.800', 'white')(props),
        },
        _selected: {
          bg: mode('black', 'white')(props),
          color: mode('white', 'black')(props),
          _hover: {
            color: mode('white', 'black')(props),
          },
        },
      },
    }),
    button: {
      tab: {
        borderRadius: 'lg',
        fontWeight: 'bold',
        color: 'text.subtlest',
        _hover: {
          color: 'text.base',
        },
        _selected: {
          bg: 'background.button.secondary.base',
          color: 'text.base',
        },
      },
    },
  },
  // The default `size` or `variant` values
  defaultProps: {},
}
