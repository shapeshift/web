import { mode } from '@chakra-ui/theme-tools'

export const CardStyle = {
  parts: ['card', 'header', 'body', 'footer', 'heading'],
  baseStyle: () => ({
    card: {
      rounded: {
        base: 0,
        xl: '2xl',
      },
    },
    heading: {
      fontWeight: 'bold',
    },
  }),
  sizes: {
    md: {
      header: {
        px: {
          base: 4,
          md: 6,
        },
        py: 4,
      },
      heading: {
        fontSize: 'md',
        as: 'h5',
      },
      body: {
        py: 4,
        px: {
          base: 4,
          md: 6,
        },
      },
      footer: {
        py: 4,
        px: 6,
      },
    },
    sm: {
      header: {
        py: 2,
        px: 4,
      },
      heading: {
        fontSize: 'md',
      },
      body: {
        py: 2,
        px: 4,
      },
      footer: {
        py: 2,
        px: 4,
      },
    },
  },
  variants: {
    solid: (props: Record<string, any>) => ({
      card: {
        bg: mode('white', 'gray.785')(props),
        borderWidth: 1,
        borderColor: mode('blackAlpha.50', 'gray.750')(props),
      },
    }),
    group: (props: Record<string, any>) => ({
      card: {
        bg: mode('gray.50', 'gray.850')(props),
        borderWidth: 1,
        borderColor: mode('gray.100', 'gray.750')(props),
        borderRadius: 'xl',
      },
    }),
    default: (props: Record<string, any>) => ({
      card: {
        bg: mode('white', 'gray.785')(props),
        borderWidth: 1,
        borderColor: mode('blackAlpha.50', 'gray.750')(props),
      },
      header: {
        borderBottomWidth: 1,
        borderColor: mode('gray.200', 'gray.750')(props),
      },
      footer: {
        borderTopWidth: 1,
        borderColor: mode('gray.200', 'gray.750')(props),
      },
    }),
    outline: (props: Record<string, any>) => ({
      card: {
        borderWidth: 1,
        borderColor: mode('blackAlpha.50', 'gray.750')(props),
      },
      header: {
        borderBottomWidth: 1,
        borderColor: mode('gray.200', 'gray.750')(props),
      },
      footer: {
        borderTopWidth: 1,
        borderColor: mode('gray.200', 'gray.750')(props),
      },
    }),
    'footer-stub': (props: Record<string, any>) => ({
      card: {
        bg: mode('white', 'gray.785')(props),
        borderWidth: 1,
        borderColor: mode('blackAlpha.50', 'gray.750')(props),
      },
      footer: {
        borderTopWidth: 1,
        borderColor: mode('gray.200', 'gray.750')(props),
      },
    }),
    inverted: {
      card: {
        borderColor: 'blackAlpha.50',
        bg: 'white',
        color: 'gray.500',
      },
    },
  },
  defaultProps: {
    size: 'md',
    variant: 'solid',
  },
}
