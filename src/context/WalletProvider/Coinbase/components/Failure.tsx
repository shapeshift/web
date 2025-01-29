import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const CoinbaseFailure = () => {
  return (
    <FailureModal
      headerText={'common.error'}
      bodyText={'walletProvider.coinbase.failure.body'}
    ></FailureModal>
  )
}
