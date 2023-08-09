import { mode } from '@chakra-ui/theme-tools'

export const CardStyle = {
  parts: ['container', 'header', 'body', 'footer'],
  baseStyle: () => ({
    container: {
      rounded: {
        base: 0,
        xl: '2xl',
      },
    },
    header: {
      fontWeight: 'bold',
    },
  }),
  sizes: {
    md: {
      header: {
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
    elevated: (props: Record<string, any>) => ({
      container: {
        bg: mode('white', 'whiteAlpha.100')(props),
      },
    }),
    unstyled: {
      container: {
        bg: 'transparent',
        border: 0,
      },
      header: {
        border: 0,
      },
      footer: {
        border: 0,
      },
    },
    outline: (props: Record<string, any>) => ({
      container: {
        bg: mode('white', 'black')(props),
        borderWidth: 1,
        borderColor: mode('blackAlpha.50', 'whiteAlpha.200')(props),
      },
      header: {
        borderBottomWidth: 1,
        borderColor: mode('gray.200', 'whiteAlpha.200')(props),
      },
      footer: {
        borderTopWidth: 1,
        borderColor: mode('gray.200', 'whiteAlpha.200')(props),
      },
    }),
  },
  defaultProps: {
    size: 'md',
    variant: 'elevated',
  },
}
