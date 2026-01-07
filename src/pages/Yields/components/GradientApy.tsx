import type { TextProps } from '@chakra-ui/react'
import { Text } from '@chakra-ui/react'

type GradientApyProps = TextProps & {
  children: React.ReactNode
}

/**
 * A reusable component that displays APY percentages with a premium green-to-blue gradient.
 * Accepts all standard Chakra Text props for customization (fontSize, fontWeight, etc.).
 *
 * Usage:
 * <GradientApy fontSize="xl" fontWeight="bold">12.34%</GradientApy>
 */
export const GradientApy = ({ children, ...textProps }: GradientApyProps) => {
  return (
    <Text
      bgGradient='linear(to-r, green.300, blue.400)'
      bgClip='text'
      fontWeight='bold'
      {...textProps}
    >
      {children}
    </Text>
  )
}
