export const ProgressStyle = {
  parts: ['track', 'filledTrack', 'label'],
  // Styles for the base style
  baseStyle: {
    track: {},
    filledTrack: {
      borderRadius: 'full'
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
