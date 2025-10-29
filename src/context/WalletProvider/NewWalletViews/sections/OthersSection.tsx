import { Box, Button, Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { CoinbaseIcon } from '@/components/Icons/CoinbaseIcon'
import { WalletConnectIcon } from '@/components/Icons/WalletConnectIcon'
import { Text } from '@/components/Text'
import { WalletListButton } from '@/context/WalletProvider/components/WalletListButton'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useMipdProviders } from '@/lib/mipd'

export type OtherWalletOptionProps = {
  connect: () => void
  isSelected: boolean
  isDisabled: boolean
  icon: React.ReactElement
  name: string
}

// Default component that renders an other wallet option
const OtherWalletOption = ({
  connect,
  isSelected,
  isDisabled,
  icon,
  name,
}: OtherWalletOptionProps) => {
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
          {icon}
        </Box>
        <Text translation={name} fontSize='md' fontWeight='medium' />
      </Flex>
    </Box>
  )
}

export const OtherWalletListButton = ({
  connect,
  isSelected,
  isDisabled,
  icon,
  name,
}: OtherWalletOptionProps) => {
  return (
    <WalletListButton
      name={name}
      icon={icon}
      onSelect={connect}
      isSelected={isSelected}
      isDisabled={isDisabled}
    />
  )
}

const coinbaseIcon = <CoinbaseIcon />
const walletConnectIcon = <WalletConnectIcon />

export type OthersSectionProps = {
  isLoading: boolean
  selectedWalletId: string | null
  onWalletSelect: (id: string, initialRoute: string) => void
  renderItem?: React.ComponentType<OtherWalletOptionProps>
  showWalletConnect?: boolean
  showHeader?: boolean
}

export const OthersSection = ({
  isLoading,
  selectedWalletId,
  onWalletSelect,
  renderItem: RenderItem = OtherWalletOption,
  showHeader = true,
  showWalletConnect = true,
}: OthersSectionProps) => {
  const translate = useTranslate()
  const { connect } = useWallet()

  const mipdProviders = useMipdProviders()
  const isCoinbaseInstalled = useMemo(
    () => mipdProviders.some(provider => provider.info.rdns === 'com.coinbase.wallet'),
    [mipdProviders],
  )

  const handleConnectWalletConnect = useCallback(() => {
    onWalletSelect(KeyManager.WalletConnectV2, '/walletconnectv2/connect')
    connect(KeyManager.WalletConnectV2, false)
  }, [connect, onWalletSelect])

  const handleCoinbaseQRConnect = useCallback(() => {
    onWalletSelect('coinbaseQR', '/coinbase/connect')
    connect(KeyManager.Coinbase, false)
  }, [connect, onWalletSelect])

  return (
    <Stack spacing={2} my={showHeader ? 6 : 0}>
      {showHeader && (
        <Text fontSize='sm' fontWeight='medium' color='gray.500' translation='common.others' />
      )}
      {showWalletConnect && (
        <RenderItem
          connect={handleConnectWalletConnect}
          isSelected={selectedWalletId === KeyManager.WalletConnectV2}
          isDisabled={isLoading && selectedWalletId !== KeyManager.WalletConnectV2}
          icon={walletConnectIcon}
          name={translate('plugins.walletConnectToDapps.modal.title')}
        />
      )}
      {/* Only show the Coinbase magic QR option under "Others" if Coinbase isn't announced as a wallet in browser.
          That's a limitation of coinbase SDK, where we cannot programmatically trigger the QR modal, it only 
          automatically shows up *if* no Coinbase wallet is detected. 
      */}
      {!isCoinbaseInstalled && (
        <RenderItem
          connect={handleCoinbaseQRConnect}
          // NOTE: This is different from the regular Coinbase option, do *not* use Keymanager.Coinbase here
          isSelected={selectedWalletId === 'coinbaseQR'}
          isDisabled={isLoading && selectedWalletId !== 'coinbaseQR'}
          icon={coinbaseIcon}
          name={translate('walletProvider.coinbaseQR.name')}
        />
      )}
    </Stack>
  )
}
