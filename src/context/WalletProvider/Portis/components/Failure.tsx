import { FailureModal } from 'context/WalletProvider/components/FailureModal'

export const PortisFailure = () => {
  return (
    <FailureModal
      headerText={'walletprovider.portisFailure.header'}
      bodyText={'walletProvider.portisFailure.body'}
    ></FailureModal>
  )
}
