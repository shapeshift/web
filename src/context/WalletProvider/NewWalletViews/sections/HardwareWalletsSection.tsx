import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { Box, Button, Flex, Stack, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
import { Text } from 'components/Text'
import { KeepKeyConfig } from 'context/WalletProvider/KeepKey/config'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { LedgerConfig } from 'context/WalletProvider/Ledger/config'
import { useWallet } from 'hooks/useWallet/useWallet'

const LedgerIcon = LedgerConfig.icon
const KeepKeyIcon = KeepKeyConfig.icon

type WalletOptionProps = {
  connect: () => void
  isSelected: boolean
  isDisabled: boolean
  icon: ComponentWithAs<'svg', IconProps>
  name: string
}

const WalletOption = ({ connect, isSelected, isDisabled, icon: Icon, name }: WalletOptionProps) => {
  const backgroundColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')

  return (
    <Box
      as={Button}
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
          {name}
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
    onWalletSelect(KeyManager.Ledger, '/ledger/connect')
    connect(KeyManager.Ledger, false)
  }, [connect, onWalletSelect])

  const handleConnectKeepKey = useCallback(() => {
    onWalletSelect(KeyManager.KeepKey, '/keepkey/connect')
    connect(KeyManager.KeepKey, false)
  }, [connect, onWalletSelect])

  return (
    <Stack spacing={2} my={6}>
      <Text
        fontSize='sm'
        fontWeight='medium'
        color='gray.500'
        translation='common.hardwareWallets'
      />
      <WalletOption
        connect={handleConnectLedger}
        isSelected={selectedWalletId === KeyManager.Ledger}
        isDisabled={isLoading && selectedWalletId !== KeyManager.Ledger}
        icon={LedgerIcon}
        name={LedgerConfig.name}
      />
      <WalletOption
        connect={handleConnectKeepKey}
        isSelected={selectedWalletId === KeyManager.KeepKey}
        isDisabled={isLoading && selectedWalletId !== KeyManager.KeepKey}
        icon={KeepKeyIcon}
        name={KeepKeyConfig.name}
      />
    </Stack>
  )
}
