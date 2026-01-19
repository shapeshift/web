import { Box, useColorModeValue } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

export const LoadingIndicator = () => {
  const dotBg = useColorModeValue('gray.400', 'gray.500')

  return (
    <Box alignSelf='flex-start' px={4} py={2}>
      <Box
        as='span'
        display='inline-block'
        w='8px'
        h='8px'
        borderRadius='full'
        bg={dotBg}
        animation={`${pulse} 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite`}
      />
    </Box>
  )
}
