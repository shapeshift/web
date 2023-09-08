import { mode } from '@chakra-ui/theme-tools'

export const ProgressStyle = {
  parts: ['track', 'filledTrack', 'label'],
  // Styles for the base style
  baseStyle: (props: Record<string, any>) => ({
    track: {
      bg: mode('blackAlpha.100', 'whiteAlpha.100')(props),
    },
    filledTrack: {
      borderRadius: 'full',
    },
  }),
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {
    'right-aligned': {
      filledTrack: {
        marginLeft: 'auto',
      },
    },
  },
  // The default `size` or `variant` values
  defaultProps: {},
}
