import { Box, Button, Flex, Image, Stack, Text as CText } from '@chakra-ui/react'
import { uniqBy } from 'lodash'
import type { EIP6963ProviderDetail } from 'mipd'
import { useCallback, useMemo } from 'react'
import { isMobile } from 'react-device-detect'
import { Text } from 'components/Text'
import type { KeyManager } from 'context/WalletProvider/KeyManager'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from 'lib/globals'
import { useMipdProviders } from 'lib/mipd'

const MipdProviderSelectItem = ({
  provider,
  connect,
  isSelected,
}: {
  provider: EIP6963ProviderDetail
  connect: (adapter: string) => void
  isSelected: boolean
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
      px={2}
      ml={-2}
      py={6}
      borderRadius='md'
      width='full'
      onClick={handleConnect}
      bg={isSelected ? 'whiteAlpha.100' : undefined}
    >
      <Flex alignItems='center' width='full'>
        <Image src={provider.info.icon} boxSize='24px' mr={3} />
        <CText>{provider.info.name}</CText>
      </Flex>
    </Box>
  )
}

export const InstalledWalletsSection = ({ selectedWallet }: { selectedWallet: string | null }) => {
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
    (rdns: string) => connect(rdns as KeyManager, true),
    [connect],
  )

  return (
    <Stack spacing={2} my={6}>
      <Text fontSize='sm' fontWeight='medium' color='gray.500' translation='Installed' />
      {filteredProviders.map(provider => {
        const isSelected = selectedWallet === provider.info.rdns
        return (
          <MipdProviderSelectItem
            key={provider.info.rdns}
            provider={provider}
            connect={handleConnectMipd}
            isSelected={isSelected}
          />
        )
      })}
    </Stack>
  )
}
