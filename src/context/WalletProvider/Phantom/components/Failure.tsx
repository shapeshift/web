import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const PhantomFailure = () => {
  return (
    <FailureModal
      headerText={'common.error'}
      bodyText={'walletProvider.phantom.errors.connectFailure'}
    />
  )
}
