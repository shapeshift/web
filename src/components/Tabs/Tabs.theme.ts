import { mode } from '@chakra-ui/theme-tools'

export const TabsStyle = {
  parts: ['tab', 'tablist'],
  // Styles for the base style
  baseStyle: {},
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {
    enclosed: (props: Record<string, any>) => ({
      tablist: {
        borerColor: mode('gray.100', 'gray.750')(props),
        'button:first-child': {
          borderLeftWidth: 0,
          borderTopRightRadius: 0,
          borderTopLeftRadius: 'xl',
        },
        'button:last-child': {
          borderRightWidth: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 'xl',
        },
      },
      tab: {
        py: 4,
        fontWeight: 'bold',
        borderColor: mode('gray.100', 'gray.750')(props),
        bg: mode('gray.100', 'gray.850')(props),
        color: 'gray.500',
        _hover: {
          color: mode('black', 'white')(props),
        },
        _selected: {
          bg: 'transparent',
          borderBottomColor: mode('gray.100', 'gray.785')(props),
          borderColor: mode('gray.100', 'gray.750')(props),
          color: mode('black', 'white')(props),
        },
      },
    }),
    'enclosed-colored': (props: Record<string, any>) => ({
      tab: {
        bg: mode('gray.50', 'gray.750')(props),
        py: 4,
        color: 'gray.500',
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
      tablist: {
        bg: mode('gray.50', 'gray.900')(props),
        margin: 2,
        padding: 1,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: mode('gray.100', 'gray.750')(props),
        borderRadius: 'xl',
      },
      tab: {
        borderRadius: 'xl',
        _hover: {
          color: mode('gray.800', 'white')(props),
        },
        _selected: {
          bg: 'blue.500',
          color: 'white',
          _hover: {
            color: 'white',
          },
        },
      },
    }),
  },
  // The default `size` or `variant` values
  defaultProps: {},
}
