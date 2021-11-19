import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const MetaMaskFailure = () => {
  return (
    <FailureModal
      headerText={'walletProvider.metaMask.failure.header'}
      bodyText={'walletProvider.metaMask.failure.body'}
    ></FailureModal>
  )
}
