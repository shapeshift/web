import { mode } from '@chakra-ui/theme-tools'

export const InputStyle = {
  parts: ['field', 'addon'],
  // Styles for the base style
  baseStyle: () => ({
    field: {
      _placeholder: {
        color: 'text.subtle',
      },
    },
  }),
  // Styles for the size variations
  sizes: {
    md: {
      field: {
        borderRadius: 'xl',
      },
    },
    lg: {
      field: {
        borderRadius: 'xl',
      },
    },
    xl: {
      field: {
        height: 16,
        borderRadius: 'xl',
      },
      addon: {
        height: 16,
      },
    },
  },
  // Styles for the visual style variations
  variants: {
    filled: () => ({
      field: {
        bg: 'background.input.base',
        borderWidth: 2,
        borderColor: 'border.input',
        _hover: {
          bg: 'background.input.hover',
        },
        _focus: {
          bg: 'background.input.pressed',
          borderColor: 'border.focused',
          _invalid: {
            borderColor: 'border.error',
          },
        },
        _invalid: {
          borderColor: 'border.error',
          color: 'text.error',
        },
      },
    }),
    inline: (props: Record<string, any>) => ({
      field: {
        bg: 'none',
        p: 0,
        _invalid: {
          color: mode('red.500', 'red.300')(props),
        },
      },
    }),
  },
  // The default `size` or `variant` values
  defaultProps: {},
}
