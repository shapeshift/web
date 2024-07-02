export const AccordionStyle = {
  parts: ['container'],
  sizes: {},
  // Styles for the visual style variations
  variants: {
    default: {
      button: {
        textAlign: 'left',
      },
      panel: {
        textAlign: 'left',
      },
      container: {
        borderTopWidth: 0,
        '&:first-of-type:last-of-type': {
          borderBottomWidth: 0,
        },
        '&:last-of-type': {
          borderBottomWidth: 0,
        },
      },
    },
  },
  // The default `size` or `variant` values
  defaultProps: {},
}
