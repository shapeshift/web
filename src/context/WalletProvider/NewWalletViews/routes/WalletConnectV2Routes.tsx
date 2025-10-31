import { PairBody } from '../components/PairBody'

import { WalletConnectV2Config } from '@/context/WalletProvider/WalletConnectV2/config'
import { useWalletConnectV2Pairing } from '@/context/WalletProvider/WalletConnectV2/useWalletConnectV2Pairing'
import { useWallet } from '@/hooks/useWallet/useWallet'

const Icon = WalletConnectV2Config.icon
const icon = <Icon boxSize='64px' />

export const NewWalletConnectV2Connect = () => {
  const { pairDevice, isLoading, error } = useWalletConnectV2Pairing()

  return (
    <PairBody
      icon={icon}
      headerTranslation='walletProvider.walletConnect.connect.header'
      bodyTranslation='walletProvider.walletConnect.connect.body'
      buttonTranslation='walletProvider.walletConnect.connect.button'
      isLoading={isLoading}
      error={error}
      onPairDeviceClick={pairDevice}
    />
  )
}

// Yeah, this isn't a router component but just keeping the "Routes" name for consistency
export const WalletConnectV2Routes = () => {
  const {
    state: { modalType },
  } = useWallet()

  if (!modalType) return null

  return <NewWalletConnectV2Connect />
}
