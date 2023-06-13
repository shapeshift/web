import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const CoinbaseFailure = () => {
  return (
    <FailureModal
      headerText={'walletProvider.coinbase.failure.header'}
      bodyText={'walletProvider.coinbase.failure.body'}
    ></FailureModal>
  )
}
