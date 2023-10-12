import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const LedgerFailure = () => {
  return (
    <FailureModal
      headerText={'walletProvider.ledger.failure.header'}
      bodyText={'walletProvider.ledger.failure.body'}
    ></FailureModal>
  )
}
