import { Button, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { Text } from '@/components/Text'

type LedgerReadOnlyBodyProps = {
  icon: ReactNode
  onConnectReadOnly: () => void
}

export const LedgerReadOnlyBody = ({ icon, onConnectReadOnly }: LedgerReadOnlyBodyProps) => {
  return (
    <Flex direction='column' alignItems='center' justifyContent='center' height='full' gap={6}>
      {icon}
      <Text fontSize='xl' translation='walletProvider.ledger.failure.header' />
      <Text color='gray.500' translation='walletProvider.ledger.failure.body' textAlign='center' />
      <Button maxW='200px' width='100%' colorScheme='blue' onClick={onConnectReadOnly}>
        <Text translation='walletProvider.ledger.readOnly.button' />
      </Button>
    </Flex>
  )
}
