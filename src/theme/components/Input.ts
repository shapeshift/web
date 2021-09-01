import { mode } from '@chakra-ui/theme-tools'

export const InputStyle = {
  parts: ['field', 'addon'],
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
      field: {
        bg: mode('gray.50', 'gray.850')(props),
        borderColor: mode('gray.100', 'gray.750')(props),
        _hover: {
          bg: mode('gray.100', 'gray.900')(props)
        },
        _focus: {
          bg: mode('gray.100', 'gray.900')(props)
        }
      }
    })
  },
  // The default `size` or `variant` values
  defaultProps: {}
}
