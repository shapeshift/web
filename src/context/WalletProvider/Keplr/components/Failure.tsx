import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const KeplrFailure = () => {
  return (
    <FailureModal
      headerText={'walletProvider.keplr.failure.header'}
      bodyText={'walletProvider.keplr.failure.body'}
    ></FailureModal>
  )
}
