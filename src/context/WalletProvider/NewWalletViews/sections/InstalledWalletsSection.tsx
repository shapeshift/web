import { Box, Button, Flex, Image, Stack, Text as CText } from '@chakra-ui/react'
import { uniqBy } from 'lodash'
import type { EIP6963ProviderDetail } from 'mipd'
import { useCallback, useMemo } from 'react'
import { isMobile } from 'react-device-detect'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import type { KeyManager } from 'context/WalletProvider/KeyManager'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from 'lib/globals'
import { useMipdProviders } from 'lib/mipd'

const MipdProviderSelectItem = ({
  provider,
  connect,
  isSelected,
  isDisabled,
}: {
  provider: EIP6963ProviderDetail
  connect: (adapter: string) => void
  isSelected: boolean
  isDisabled: boolean
}) => {
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
      bg={isSelected ? 'whiteAlpha.100' : undefined}
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
  const detectedMipdProviders = useMipdProviders()

  const supportedStaticProviders = useMemo(() => {
    if (isMobileApp || isMobile) return []
    // TODO(gomes): This says installed, so we only display... installed. Static ones (MM, Rabby, XDEFI) will either be displayed as their own section (EVM wallets/others), or
    // not at all, TBD with product
    return []
  }, [])

  const mipdProviders = useMemo(
    () => uniqBy(detectedMipdProviders.concat(supportedStaticProviders), 'info.rdns'),
    [detectedMipdProviders, supportedStaticProviders],
  )

  // TODO(gomes): wat do with these? two options here
  // 1. keep filtering out and add as explicit options in the list (not under installed)
  // 2. don't filter out, but still explicitly handle those 3 as they are not pure EVM wallets / rdns providers
  // - keplr is an EVM/Cosmos SDK wallet, but we only support the latter (and if we were to use it as rdns provider, we'd only support the former)
  // - Phantom is Solana + BTC + ETH, and we support it all (we'd only support the ETH part if we were to handle it as rdns provider)
  // - Coinbase *is* an EVM-only wallet, but has some magic-QR pairing flow we support explicitly in hdwallet
  const filteredProviders = useMemo(
    () =>
      mipdProviders.filter(
        provider =>
          provider.info.rdns !== 'app.keplr' &&
          provider.info.rdns !== 'app.phantom' &&
          provider.info.rdns !== 'com.coinbase.wallet',
      ),
    [mipdProviders],
  )

  const handleConnectMipd = useCallback(
    (rdns: string) => {
      onWalletSelect(rdns, '/metamask/connect')
      connect(rdns as KeyManager, true)
    },
    [connect, onWalletSelect],
  )

  return (
    <Stack spacing={2} my={6}>
      <Text fontSize='sm' fontWeight='medium' color='gray.500' translation='Installed' />
      {filteredProviders.map(provider => {
        const isSelected = selectedWalletId === provider.info.rdns
        return (
          <MipdProviderSelectItem
            key={provider.info.rdns}
            provider={provider}
            connect={handleConnectMipd}
            isSelected={isSelected}
            // Disable other options when pairing is in progress, to avoid race conditions
            isDisabled={isLoading && !isSelected}
          />
        )
      })}
    </Stack>
  )
}
