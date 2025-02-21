import { Box, Button, Flex, Image, Stack, Text as CText, useColorModeValue } from '@chakra-ui/react'
import type { EIP6963ProviderDetail } from 'mipd'
import { useCallback, useMemo } from 'react'
import { useMipdProviders } from 'lib/mipd'

import { RDNS_TO_FIRST_CLASS_KEYMANAGER } from '../constants'

import { Text } from '@/components/Text'
import type { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'

const MipdProviderSelectItem = ({
  provider,
  connect,
  isSelected,
  isDisabled,
}: {
  provider: EIP6963ProviderDetail
  connect: (adapter: string | KeyManager) => void
  isSelected: boolean
  isDisabled: boolean
}) => {
  const backgroundColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const handleConnect = useCallback(
    () => connect(provider.info.rdns),
    [connect, provider.info.rdns],
  )

  return (
    <Box
      as={Button}
      key={provider.info.rdns}
      variant='ghost'
      px={4}
      ml={-4}
      py={6}
      borderRadius='md'
      width='full'
      onClick={handleConnect}
      bg={isSelected ? backgroundColor : undefined}
      isDisabled={isDisabled}
    >
      <Flex alignItems='center' width='full'>
        <Image src={provider.info.icon} boxSize='24px' mr={3} />
        <CText>{provider.info.name}</CText>
      </Flex>
    </Box>
  )
}

export const InstalledWalletsSection = ({
  isLoading,
  selectedWalletId,
  onWalletSelect,
}: {
  isLoading: boolean
  selectedWalletId: string | null
  onWalletSelect: (id: string, initialRoute: string) => void
}) => {
  const { connect } = useWallet()
  const mipdProviders = useMipdProviders()

  // Filter out providers that have first-class implementations
  const filteredProviders = useMemo(
    () =>
      mipdProviders.filter(
        provider => !Object.keys(RDNS_TO_FIRST_CLASS_KEYMANAGER).includes(provider.info.rdns),
      ),
    [mipdProviders],
  )

  // Get first-class providers that are installed
  const firstClassProviders = useMemo(
    () => mipdProviders.filter(provider => provider.info.rdns in RDNS_TO_FIRST_CLASS_KEYMANAGER),
    [mipdProviders],
  )

  const handleConnectMipd = useCallback(
    (rdns: string) => {
      onWalletSelect(rdns, '/metamask/connect')
      connect(rdns as KeyManager, true)
    },
    [connect, onWalletSelect],
  )

  const handleConnectFirstClass = useCallback(
    (rdns: string) => {
      const keyManager = RDNS_TO_FIRST_CLASS_KEYMANAGER[rdns]
      onWalletSelect(rdns, `/${keyManager.toLowerCase()}/connect`)
      connect(keyManager, false)
    },
    [connect, onWalletSelect],
  )

  return (
    <Stack spacing={2} my={6}>
      <Text fontSize='sm' fontWeight='medium' color='gray.500' translation='common.installed' />
      {/* First-class implementations always go first */}
      {firstClassProviders.map(provider => (
        <MipdProviderSelectItem
          key={provider.info.rdns}
          provider={provider}
          connect={handleConnectFirstClass}
          isSelected={selectedWalletId === provider.info.rdns}
          isDisabled={isLoading && selectedWalletId !== provider.info.rdns}
        />
      ))}
      {/* MIPD providers */}
      {filteredProviders.map(provider => (
        <MipdProviderSelectItem
          key={provider.info.rdns}
          provider={provider}
          connect={handleConnectMipd}
          isSelected={selectedWalletId === provider.info.rdns}
          isDisabled={isLoading && selectedWalletId !== provider.info.rdns}
        />
      ))}
    </Stack>
  )
}
