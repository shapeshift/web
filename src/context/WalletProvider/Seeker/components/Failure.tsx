import { FailureModal } from '@/context/WalletProvider/components/FailureModal'

export const SeekerFailure = () => {
  return (
    <FailureModal
      headerText={'walletProvider.seeker.failure.header'}
      bodyText={'walletProvider.seeker.failure.body'}
    />
  )
}
