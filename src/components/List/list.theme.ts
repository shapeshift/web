import { mode } from '@chakra-ui/theme-tools'

export const ListStyle = {
  parts: ['container', 'item', 'icon'],
  // Styles for the base style
  baseStyle: {},
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {
    numerList: {
      container: {
        listStyleType: 'none',
        counterReset: 'numberlist-counter',
        position: 'relative'
      },
      item: {
        counterIncrement: 'numberlist-counter',
        display: 'flex',
        alignItems: 'center',
        ml: '1.75rem',
        '&:before': {
          content: 'counter(numberlist-counter)',
          color: 'white',
          fontSize: 'xs',
          bg: 'blackAlpha.500',
          fontWeight: 'bold',
          borderRadius: 'full',
          height: '1.25rem',
          width: '1.25rem',
          left: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }
    }
  },
  // The default `size` or `variant` values
  defaultProps: {}
}
