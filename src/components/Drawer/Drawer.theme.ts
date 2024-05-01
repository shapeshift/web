import { drawerAnatomy as parts } from '@chakra-ui/anatomy'
import { createMultiStyleConfigHelpers } from '@chakra-ui/styled-system'

const { definePartsStyle } = createMultiStyleConfigHelpers(parts.keys)

const centeredContent = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  height: '100%',
  width: '100%',
  textAlign: 'center',
  justifyContent: 'center',
}

const centered = definePartsStyle({
  header: {
    ...centeredContent,
  },

  body: {
    ...centeredContent,
  },
  footer: {
    marginTop: 'auto',
  },
})

export const DrawerStyle = {
  parts: ['dialog'],
  // Styles for the base style
  baseStyle: () => ({
    dialog: {
      bg: 'background.surface.overlay.base',
    },
  }),
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: { centered },
  // The default `size` or `variant` values
  defaultProps: {},
}
