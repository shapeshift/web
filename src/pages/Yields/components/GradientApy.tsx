import type { TextProps } from '@chakra-ui/react'
import { Text } from '@chakra-ui/react'
import { memo } from 'react'

type GradientApyProps = TextProps & {
  children: React.ReactNode
}

export const GradientApy = memo(({ children, ...textProps }: GradientApyProps) => {
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
})
