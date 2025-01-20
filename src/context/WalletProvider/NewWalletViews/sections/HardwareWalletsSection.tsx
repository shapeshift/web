import { Box, Button, Flex, Stack, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
import { Text } from 'components/Text'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { LedgerConfig } from 'context/WalletProvider/Ledger/config'
import { useWallet } from 'hooks/useWallet/useWallet'

const Icon = LedgerConfig.icon

const LedgerOption = ({
  connect,
  isSelected,
  isDisabled,
}: {
  connect: () => void
  isSelected: boolean
  isDisabled: boolean
}) => {
  const backgroundColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')

  return (
    <Box
      as={Button}
      key='ledger'
      variant='ghost'
      px={4}
      ml={-4}
      py={6}
      borderRadius='md'
      width='full'
      onClick={connect}
      bg={isSelected ? backgroundColor : undefined}
      isDisabled={isDisabled}
    >
      <Flex alignItems='center' width='full'>
        <Box boxSize='24px' mr={3}>
          <Icon />
        </Box>
        <CText fontSize='md' fontWeight='medium'>
          {LedgerConfig.name}
        </CText>
      </Flex>
    </Box>
  )
}

export const HardwareWalletsSection = ({
  isLoading,
  selectedWalletId,
  onWalletSelect,
}: {
  isLoading: boolean
  selectedWalletId: string | null
  onWalletSelect: (id: string, initialRoute: string) => void
}) => {
  const { connect } = useWallet()

  const handleConnectLedger = useCallback(() => {
    onWalletSelect('ledger', '/ledger/connect')
    connect(KeyManager.Ledger, false)
  }, [connect, onWalletSelect])

  return (
    <Stack spacing={2} my={6}>
      <Text
        fontSize='sm'
        fontWeight='medium'
        color='gray.500'
        translation='common.hardwareWallets'
      />
      <LedgerOption
        connect={handleConnectLedger}
        isSelected={selectedWalletId === 'ledger'}
        isDisabled={isLoading && selectedWalletId !== 'ledger'}
      />
    </Stack>
  )
}
