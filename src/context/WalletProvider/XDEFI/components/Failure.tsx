import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const XDEFIFailure = () => {
  return (
    <FailureModal
      headerText={'common.error'}
      bodyText={'walletProvider.xdefi.failure.body'}
    ></FailureModal>
  )
}
