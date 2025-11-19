import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import { Box, Button, Flex, Stack, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'

import { Text } from '@/components/Text'
import { GridPlusConfig } from '@/context/WalletProvider/GridPlus/config'
import { KeepKeyConfig } from '@/context/WalletProvider/KeepKey/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { LedgerConfig } from '@/context/WalletProvider/Ledger/config'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'

const LedgerIcon = LedgerConfig.icon
const KeepKeyIcon = KeepKeyConfig.icon
const GridPlusIcon = GridPlusConfig.icon

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
      whiteSpace='normal'
      px={4}
      ml='-16px'
      mr='-16px'
      py={2.5}
      borderRadius='md'
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

  const handleConnectGridPlus = useCallback(() => {
    onWalletSelect(KeyManager.GridPlus, '/gridplus/connect')
    connect(KeyManager.GridPlus, false)
  }, [connect, onWalletSelect])

  const isGridPlusWalletEnabled = useFeatureFlag('GridPlusWallet')

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
      {isGridPlusWalletEnabled && (
        <WalletOption
          connect={handleConnectGridPlus}
          isSelected={selectedWalletId === KeyManager.GridPlus}
          isDisabled={isLoading && selectedWalletId !== KeyManager.GridPlus}
          icon={GridPlusIcon}
          name={GridPlusConfig.name}
        />
      )}
    </Stack>
  )
}
