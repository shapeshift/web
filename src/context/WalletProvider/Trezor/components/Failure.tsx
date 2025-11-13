import { FailureModal } from '@/context/WalletProvider/components/FailureModal'

export const TrezorFailure = () => {
  return (
    <FailureModal
      headerText={'common.error'}
      bodyText={'walletProvider.trezor.failure.body'}
    ></FailureModal>
  )
}
