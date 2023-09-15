export const CardStyle = {
  parts: ['container', 'header', 'body', 'footer'],
  baseStyle: () => ({
    header: {
      fontWeight: 'bold',
    },
  }),
  sizes: {
    md: {
      container: {
        borderRadius: '2xl',
      },
      header: {
        py: 4,
        px: {
          base: 4,
          md: 6,
        },
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
      container: {
        borderRadius: 'lg',
      },
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
    elevated: () => ({
      container: {
        bg: 'background.surface.raised.base',
        borderColor: 'border.base',
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
    outline: () => ({
      container: {
        bg: 'transparent',
        borderWidth: 1,
        borderColor: 'border.base',
      },
      header: {
        borderBottomWidth: 1,
        borderColor: 'border.base',
      },
      footer: {
        borderTopWidth: 1,
        borderColor: 'border.base',
      },
    }),
  },
  defaultProps: {
    size: 'md',
    variant: 'elevated',
  },
}
