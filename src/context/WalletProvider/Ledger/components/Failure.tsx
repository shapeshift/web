import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const LedgerFailure = () => {
  return (
    <FailureModal
      headerText={'common.error'}
      bodyText={'walletProvider.ledger.failure.body'}
    ></FailureModal>
  )
}
