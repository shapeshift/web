import { Collapse, Stack, StackDivider, useColorModeValue } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export const TransactionDetailsContainer = ({
  children,
  isOpen,
  compactMode,
}: {
  children: ReactNode
  isOpen: boolean
  compactMode: boolean
}) => {
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  return (
    <Collapse in={isOpen} unmountOnExit>
      <Stack
        direction={{ base: 'column-reverse', lg: compactMode ? 'column-reverse' : 'row' }}
        spacing={4}
        divider={<StackDivider />}
        pl={{ base: 4, lg: compactMode ? 4 : 6 }}
        pr={4}
        py={{ base: 4, lg: compactMode ? 4 : 0 }}
        alignItems='flex-start'
        borderTopWidth={1}
        borderColor={borderColor}
        fontSize={{ base: 'sm', lg: compactMode ? 'sm' : 'md' }}
      >
        {children}
      </Stack>
    </Collapse>
  )
}
