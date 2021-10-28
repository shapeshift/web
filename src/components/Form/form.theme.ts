export const FormStyle = {
  parts: ['container', 'requiredIndicator', 'helperText'],
  // Styles for the base style
  baseStyle: (props: Record<string, any>) => ({
    requiredIndicator: {
      color: 'red.500'
    },
    helperText: {
      color: 'gray.500'
    }
  }),
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {},
  // The default `size` or `variant` values
  defaultProps: {}
}
