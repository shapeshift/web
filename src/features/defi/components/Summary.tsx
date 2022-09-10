import type { StackProps } from '@chakra-ui/react'
import { Divider, Stack, useColorModeValue } from '@chakra-ui/react'

export const Summary: React.FC<StackProps> = props => {
  const bgColor = useColorModeValue('gray.50', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  return (
    <Stack
      spacing={0}
      divider={<Divider />}
      borderWidth={1}
      bg={bgColor}
      borderColor={borderColor}
      borderRadius='xl'
      {...props}
    />
  )
}
