import { mode } from '@chakra-ui/theme-tools'
export const ModalStyle = {
  parts: ['dialog', 'footer', 'closeButton', 'header'],
  // Styles for the base style
  baseStyle: (props: Record<string, any>) => ({
    dialog: {
      bg: mode('white', 'gray.785')(props),
      borderRadius: 'xl',
      borderColor: mode('gray.50', 'gray.750')(props),
      borderWidth: 1,
    },
    header: {
      borderTopRadius: 'xl',
    },
    closeButton: {
      borderRadius: '100%',
    },
  }),
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {
    fluid: {
      dialog: {
        maxWidth: '100%',
        width: 'auto',
      },
    },
    'header-nav': (props: Record<string, any>) => ({
      dialog: {
        maxWidth: '100%',
        width: 'auto',
      },
      header: {
        borderBottom: '1px solid',
        bg: mode('gray.50', 'rgba(255,255,255,.01)')(props),
        borderColor: mode('gray.100', 'rgba(255,255,255,.05)')(props),
        borderTopRadius: 'xl',
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
