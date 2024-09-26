import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const MetaMaskFailure = () => {
  return (
    <FailureModal headerText={'common.error'} bodyText={'walletProvider.metaMask.failure.body'} />
  )
}
