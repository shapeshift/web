import { FailureModal } from '@/context/WalletProvider/components/FailureModal'

export const VultisigFailure = () => {
  return (
    <FailureModal
      headerText={'common.error'}
      bodyText={'walletProvider.vultisig.errors.connectFailure'}
    />
  )
}
