import { ButtonStyle } from 'components/Button/Button.theme'

export const TableStyle = {
  parts: ['table', 'tr', 'tbody', 'td', 'thead', 'th'],
  // Styles for the base style
  baseStyle: {
    thead: {
      tr: {
        th: {
          paddingLeft: 4,
          paddingRight: 4,
        },
      },
    },
    tbody: {
      tr: {
        td: {
          paddingLeft: 4,
          paddingRight: 4,
        },
      },
    },
  },
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {
    clickable: (parentProps: Record<string, any>) => ({
      tbody: {
        tr: {
          ...ButtonStyle.baseStyle,
          ...ButtonStyle.variants.ghost({ colorScheme: 'gray', ...parentProps }),
          _disabled: {
            ...ButtonStyle.baseStyle._disabled,
            pointerEvents: 'none',
          },
          'td:first-of-type': {
            borderLeftRadius: 'lg',
          },
          'td:last-of-type': {
            borderRightRadius: 'lg',
          },
        },
      },
    }),
  },
  // The default `size` or `variant` values
  defaultProps: {},
}
