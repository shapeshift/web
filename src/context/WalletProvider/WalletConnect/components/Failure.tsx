import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const WalletConnectFailure = () => {
  return (
    <FailureModal
      headerText={'walletProvider.walletConnect.failure.header'}
      bodyText={'walletProvider.walletConnect.failure.body'}
    />
  )
}
