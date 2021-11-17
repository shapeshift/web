import { mode, transparentize } from '@chakra-ui/theme-tools'
export const RowStyle = {
  parts: ['row', 'label', 'value'],
  baseStyle: () => ({
    row: {
      width: 'full',
      display: 'flex',
      alignItems: 'flex-start'
    },
    label: {
      color: 'gray.500',
      fontWeight: 'medium'
    },
    value: {}
  }),
  variants: {
    horizontal: {
      row: {
        justifyContent: 'space-between',
        flexDirection: 'row'
      }
    },
    vertical: {
      row: {
        flexDirection: 'column'
      }
    },
    'btn-ghost': (props: Record<string, any>) => {
      const { colorScheme: c = 'gray', theme } = props
      const darkHoverBg = transparentize(`${c}.200`, 0.12)(theme)
      return {
        row: {
          borderRadius: 'lg',
          backgroundColor: 'transparent',
          color: mode(`${c}.600`, `${c}.200`)(props),
          _hover: {
            backgroundColor: mode(`${c}.50`, darkHoverBg)(props)
          }
        }
      }
    }
  },
  defaultProps: {
    variant: 'horizontal'
  }
}
