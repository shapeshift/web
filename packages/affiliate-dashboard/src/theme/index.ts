import type { ThemeConfig } from '@chakra-ui/react'
import { extendTheme } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

export const theme = extendTheme({
  config,
  fonts: {
    heading: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    body: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"DM Mono", "SF Mono", monospace',
  },
  colors: {
    bg: {
      canvas: '#0a0b0d',
      surface: '#12141a',
      raised: '#1a1c24',
      inset: '#0a0b0d',
    },
    border: {
      subtle: '#1e2028',
      muted: '#1a1c24',
      input: '#2a2d38',
    },
    fg: {
      default: '#e2e4e9',
      bright: '#f0f1f4',
      muted: '#7a7e8a',
      dim: '#4a4e5a',
    },
    brand: {
      50: '#EBEFFE',
      100: '#B5C4FC',
      200: '#7F99FB',
      300: '#5F80FA',
      400: '#486FF9',
      500: '#3761F9',
      600: '#2D4EC9',
      700: '#243EA1',
      800: '#1C317E',
      900: '#15255F',
    },
    success: '#4ade80',
    danger: '#f87171',
    warn: '#facc15',
    pill: {
      asset: 'rgba(55, 97, 249, 0.1)',
      assetFg: '#7F99FB',
    },
  },
  styles: {
    global: {
      'html, body': {
        bg: 'bg.canvas',
        color: 'fg.default',
      },
      '#root': {
        minHeight: '100vh',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      baseStyle: {
        fontWeight: 600,
        borderRadius: 'lg',
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      variants: {
        outline: {
          field: {
            bg: 'bg.inset',
            borderColor: 'border.input',
            fontFamily: 'mono',
            _hover: { borderColor: 'border.input' },
          },
        },
      },
    },
    NumberInput: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
    },
  },
})
