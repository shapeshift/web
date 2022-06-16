import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const TallyHoFailure = () => {
  return (
    <FailureModal
      headerText={'walletProvider.tallyHo.failure.header'}
      bodyText={'walletProvider.tallyHo.failure.body'}
    ></FailureModal>
  )
}
