import { Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
import type { ReactElement, ReactNode } from 'react'

export const WalletOptionRow = ({
  icon,
  children,
  onClick,
  isDisabled = false,
  isSelected = false,
}: {
  icon: ReactNode
  children: ReactNode
  onClick: () => void
  isDisabled?: boolean
  isSelected?: boolean
}): ReactElement => {
  const backgroundColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  return (
    <Box
      as={Button}
      variant='ghost'
      whiteSpace='normal'
      px={4}
      ml='-16px'
      mr='-16px'
      py={2.5}
      borderRadius='md'
      onClick={onClick}
      bg={isSelected ? backgroundColor : undefined}
      isDisabled={isDisabled}
    >
      <Flex alignItems='center' width='full'>
        <Box boxSize='24px' mr={3}>
          {icon}
        </Box>
        <Box fontSize='md' fontWeight='medium'>
          {children}
        </Box>
      </Flex>
    </Box>
  )
}
