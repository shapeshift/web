import { Box, Button, Flex, Stack, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'

import { Text } from '@/components/Text'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import type { StarknetInjectedKeyManager } from '@/context/WalletProvider/StarknetInjected/config'
import { STARKNET_INJECTED_KEYMANAGERS } from '@/context/WalletProvider/StarknetInjected/config'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'

const StarknetWalletOption = ({
  keyManager,
  connect,
  isSelected,
  isDisabled,
}: {
  keyManager: StarknetInjectedKeyManager
  connect: (keyManager: StarknetInjectedKeyManager) => void
  isSelected: boolean
  isDisabled: boolean
}) => {
  const backgroundColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const { icon: Icon, name } = SUPPORTED_WALLETS[keyManager]
  const handleConnect = useCallback(() => connect(keyManager), [connect, keyManager])

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
      onClick={handleConnect}
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

export const StarknetWalletsSection = ({
  isLoading,
  selectedWalletId,
  onWalletSelect,
}: {
  isLoading: boolean
  selectedWalletId: string | null
  onWalletSelect: (id: string, initialRoute: string) => void
}) => {
  const { connect } = useWallet()
  const isStarknetEnabled = useFeatureFlag('Starknet')
  const isStarknetWalletsEnabled = useFeatureFlag('StarknetWallets')

  const handleConnect = useCallback(
    (keyManager: StarknetInjectedKeyManager) => {
      onWalletSelect(keyManager, `/${keyManager}/connect`)
      connect(keyManager, false)
    },
    [connect, onWalletSelect],
  )

  if (!isStarknetEnabled || !isStarknetWalletsEnabled) return null

  return (
    <Stack spacing={2} my={6}>
      <Text
        fontSize='sm'
        fontWeight='medium'
        color='gray.500'
        translation='walletProvider.starknetInjected.sectionTitle'
      />
      {STARKNET_INJECTED_KEYMANAGERS.map(keyManager => (
        <StarknetWalletOption
          key={keyManager}
          keyManager={keyManager}
          connect={handleConnect}
          isSelected={selectedWalletId === keyManager}
          isDisabled={isLoading && selectedWalletId !== keyManager}
        />
      ))}
    </Stack>
  )
}
