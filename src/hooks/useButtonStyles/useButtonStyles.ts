import type { BackgroundProps, ButtonProps, ThemingProps } from '@chakra-ui/react'
import { useColorMode, useTheme } from '@chakra-ui/react'
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

  const buttonVariant = variants[variant as keyof typeof variants]

  const { colorMode } = useColorMode()

  const styleProps = buttonVariant({
    colorScheme,
    theme,
    colorMode,
  })

  return styleProps as ButtonProps & BackgroundProps
}
