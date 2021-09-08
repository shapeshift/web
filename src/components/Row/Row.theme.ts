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
    }
  },
  defaultProps: {
    variant: 'horizontal'
  }
}
