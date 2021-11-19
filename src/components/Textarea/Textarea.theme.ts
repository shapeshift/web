import { mode } from '@chakra-ui/theme-tools'

import { InputStyle } from '../Input/Input.theme'
export const TextareaStyle = {
  // Styles for the base style
  baseStyle: (props: Record<string, any>) => ({
    field: {
      _placeholder: {
        color: mode('gray.300', 'gray.700')(props)
      }
    }
  }),
  // Styles for the size variations
  sizes: {
    lg: {
      field: {
        borderRadius: 'xl'
      }
    }
  },
  // Styles for the visual style variations
  variants: {
    filled: (props: Record<string, any>) => ({
      ...InputStyle.variants.filled(props).field
    })
  },
  // The default `size` or `variant` values
  defaultProps: {}
}
