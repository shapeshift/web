import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const XDEFIFailure = () => {
  return (
    <FailureModal
      headerText={'walletProvider.xdefi.failure.header'}
      bodyText={'walletProvider.xdefi.failure.body'}
    ></FailureModal>
  )
}
