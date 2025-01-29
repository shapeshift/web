import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const KeplrFailure = () => {
  return (
    <FailureModal
      headerText={'common.error'}
      bodyText={'walletProvider.keplr.failure.body'}
    ></FailureModal>
  )
}
