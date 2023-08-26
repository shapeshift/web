import { mode } from '@chakra-ui/theme-tools'
export const ModalStyle = {
  parts: ['dialog', 'footer', 'closeButton', 'header', 'overlay'],
  // Styles for the base style
  baseStyle: () => ({
    overlay: {
      bgColor: 'blanket',
    },
    dialog: {
      bg: 'background.surface.overlay.base',
      borderRadius: '2xl',
      borderColor: 'border.base',
      borderWidth: 1,
    },
    header: {
      borderTopRadius: '2xl',
    },
    closeButton: {
      borderRadius: '100%',
    },
  }),
  // Styles for the size variations
  sizes: {
    full: {
      closeButton: {
        top: 'calc(0.5rem + env(safe-area-inset-top))',
      },
      header: {
        paddingTop: 'calc(1rem + env(safe-area-inset-top))',
      },
      footer: {
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
      },
    },
  },
  // Styles for the visual style variations
  variants: {
    fluid: {
      dialog: {
        maxWidth: '100%',
        width: 'auto',
      },
    },
    'header-nav': () => ({
      dialog: {
        maxWidth: '100%',
        width: 'auto',
      },
      header: {
        borderBottom: '1px solid',
        bg: 'background.surface.raised.accent',
        borderColor: 'border.base',
        borderTopRadius: '2xl',
        fontSize: 'md',
      },
    }),
    'fluid-footer': (props: Record<string, any>) => ({
      dialog: {
        maxWidth: '100%',
        width: 'auto',
      },
      footer: {
        borderTopWidth: 1,
        borderColor: mode('gray.100', 'gray.750')(props),
      },
    }),
  },
  // The default `size` or `variant` values
  defaultProps: {},
}
