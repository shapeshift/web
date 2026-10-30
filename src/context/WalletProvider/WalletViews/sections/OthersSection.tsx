import { Stack } from '@chakra-ui/react'
import { useCallback } from 'react'

import { CoinbaseIcon } from '@/components/Icons/CoinbaseIcon'
import { WalletConnectIcon } from '@/components/Icons/WalletConnectIcon'
import { Text } from '@/components/Text'
import { WalletOptionRow } from '@/context/WalletProvider/components/WalletOptionRow'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { OathWalletOption } from '@/context/WalletProvider/WalletConnectV2/components/OathWalletOption'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useMipdProviders } from '@/lib/mipd'

const WalletConnectOption = ({
  connect,
  isSelected,
  isDisabled,
}: {
  connect: () => void
  isSelected: boolean
  isDisabled: boolean
}) => {
  return (
    <WalletOptionRow
      icon={<WalletConnectIcon />}
      onClick={connect}
      isSelected={isSelected}
      isDisabled={isDisabled}
    >
      <Text translation='plugins.walletConnectToDapps.modal.title' />
    </WalletOptionRow>
  )
}

const CoinbaseQROption = ({
  connect,
  isSelected,
  isDisabled,
}: {
  connect: () => void
  isSelected: boolean
  isDisabled: boolean
}) => {
  return (
    <WalletOptionRow
      icon={<CoinbaseIcon />}
      onClick={connect}
      isSelected={isSelected}
      isDisabled={isDisabled}
    >
      <Text translation='walletProvider.coinbaseQR.name' />
    </WalletOptionRow>
  )
}

export const OthersSection = ({
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
  const isCoinbaseInstalled = mipdProviders.some(
    provider => provider.info.rdns === 'com.coinbase.wallet',
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
    <Stack spacing={2} my={6}>
      <Text fontSize='sm' fontWeight='medium' color='gray.500' translation='common.others' />
      <OathWalletOption isDisabled={isLoading} />
      <WalletConnectOption
        connect={handleConnectWalletConnect}
        isSelected={selectedWalletId === KeyManager.WalletConnectV2}
        isDisabled={isLoading && selectedWalletId !== KeyManager.WalletConnectV2}
      />
      {/* Only show the Coinbase magic QR option under "Others" if Coinbase isn't announced as a wallet in browser.
          That's a limitation of coinbase SDK, where we cannot programmatically trigger the QR modal, it only 
          automatically shows up *if* no Coinbase wallet is detected. 
      */}
      {!isCoinbaseInstalled && (
        <CoinbaseQROption
          connect={handleCoinbaseQRConnect}
          // NOTE: This is different from the regular Coinbase option, do *not* use Keymanager.Coinbase here
          isSelected={selectedWalletId === 'coinbaseQR'}
          isDisabled={isLoading && selectedWalletId !== 'coinbaseQR'}
        />
      )}
    </Stack>
  )
}
