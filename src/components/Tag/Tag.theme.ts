import { mode, transparentize } from '@chakra-ui/theme-tools'

export const TagStyle = {
  parts: ['container'],
  // Styles for the base style
  baseStyle: {},
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {
    subtle: (props: Record<string, any>) => {
      const { colorScheme: c, theme } = props
      if (c === 'red') {
        return {
          container: {
            backgroundColor: transparentize(`${c}.600`, 0.2)(theme),
            color: 'red.500',
          },
        }
      }
    },
    'xs-subtle': (props: Record<string, any>) => {
      const { colorScheme: c, theme } = props
      if (c === 'gray') {
        return {
          container: {
            bg: 'background.surface.raised.base',
            borderWidth: 1,
            borderColor: 'border.base',
          },
        }
      }
      const darkBg = transparentize(`${c}.700`, 0.5)(theme)
      const darkBorder = transparentize(`${c}.700`, 0.75)(theme)
      const lightBg = transparentize(`${c}.700`, 0.12)(theme)
      const lightBorder = transparentize(`${c}.700`, 0.12)(theme)
      return {
        container: {
          bg: mode(lightBg, darkBg)(props),
          borderWidth: 1,
          borderColor: mode(lightBorder, darkBorder)(props),
        },
      }
    },
  },
  // The default `size` or `variant` values
  defaultProps: {},
}
