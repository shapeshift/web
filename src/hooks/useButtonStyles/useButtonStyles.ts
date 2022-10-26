import type { BackgroundProps, ButtonProps, ThemingProps } from '@chakra-ui/react'
import { useColorMode, useTheme } from '@chakra-ui/react'
import type { SystemStyleFunction } from '@chakra-ui/theme-tools'
import { theme } from 'theme/theme'

type UseButtonStyleProps = {
  variant: ThemingProps['variant']
  colorScheme: NonNullable<ThemingProps['colorScheme']>
}

export const useButtonStyles = ({ variant, colorScheme }: UseButtonStyleProps) => {
  const {
    components: {
      Button: { variants },
    },
  } = useTheme()

  const { [variant]: buttonVariant } = variants as Record<string, SystemStyleFunction>

  const { colorMode } = useColorMode()

  const styleProps = buttonVariant({
    colorScheme,
    theme,
    colorMode,
  })

  return styleProps as ButtonProps & BackgroundProps
}
