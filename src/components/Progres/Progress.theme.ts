export const ProgressStyle = {
  parts: ['track', 'filledTrack', 'label'],
  // Styles for the base style
  baseStyle: {
    track: {
      bg: 'red'
    },
    filledTrack: {
      borderRadius: 'full',
      bg: 'red'
    }
  },
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {
    'right-aligned': {
      filledTrack: {
        marginLeft: 'auto'
      }
    }
  },
  // The default `size` or `variant` values
  defaultProps: {}
}
