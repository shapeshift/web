import { Collapse, Stack, StackDivider } from '@chakra-ui/react'
import { ReactNode } from 'react'

export const TransactionDetailsContainer = ({
  children,
  isOpen,
  compactMode
}: {
  children: ReactNode
  isOpen: boolean
  compactMode: boolean
}) => (
  <Collapse in={isOpen} unmountOnExit>
    <Stack
      direction={{ base: 'column', lg: compactMode ? 'column' : 'row' }}
      spacing={4}
      divider={<StackDivider />}
      mx={-4}
      pl={{ base: 4, lg: 6 }}
      pr={4}
      pb={{ base: 4, lg: compactMode ? 4 : 0 }}
      alignItems='flex-start'
      borderTopWidth={1}
      borderColor='gray.750'
    >
      {children}
    </Stack>
  </Collapse>
)
