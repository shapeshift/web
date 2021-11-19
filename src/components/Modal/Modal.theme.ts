import { mode } from '@chakra-ui/theme-tools'
export const ModalStyle = {
  parts: ['dialog', 'footer', 'closeButton'],
  // Styles for the base style
  baseStyle: (props: Record<string, any>) => ({
    dialog: {
      bg: mode('white', 'gray.785')(props),
      borderRadius: 'xl',
      borderColor: mode('gray.50', 'gray.750')(props),
      borderWidth: 1
    },
    closeButton: {
      borderRadius: '100%',
      color: 'gray.500',
      _hover: {
        color: mode('black', 'white')(props)
      }
    }
  }),
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {
    fluid: {
      dialog: {
        maxWidth: '100%',
        width: 'auto'
      }
    },
    'fluid-footer': (props: Record<string, any>) => ({
      dialog: {
        maxWidth: '100%',
        width: 'auto'
      },
      footer: {
        borderTopWidth: 1,
        borderColor: mode('gray.100', 'gray.750')(props)
      }
    })
  },
  // The default `size` or `variant` values
  defaultProps: {}
}
