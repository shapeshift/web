import { FailureModal } from '../../components/FailureModal'

export const TonConnectFailure = () => {
  return (
    <FailureModal
      headerText={'walletProvider.tonConnect.failure.header'}
      bodyText={'walletProvider.tonConnect.failure.body'}
    />
  )
}
