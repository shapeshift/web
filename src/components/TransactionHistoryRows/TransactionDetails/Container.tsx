import { Box, Collapse, Flex } from '@chakra-ui/react'
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
    <Box pl={{ base: 2, lg: 10 }} pr={{ base: 2, lg: 10 }} pb={6}>
      <Flex
        flexDir={{ base: 'column', lg: compactMode ? 'column' : 'row' }}
        flexWrap='wrap'
        pl={{ base: 1, lg: 3 }}
        mb={{ base: 0, lg: 3 }}
      >
        {children}
      </Flex>
    </Box>
  </Collapse>
)
