import { SessionProposalModal } from 'plugins/walletConnectV2/components/modal/SessionProposal'
import type { WalletConnectContextType } from 'plugins/walletConnectV2/types'
import { WalletConnectActionType, WalletConnectModal } from 'plugins/walletConnectV2/types'
import type { FC } from 'react'

type Props = {
  state: WalletConnectContextType['state']
  dispatch: WalletConnectContextType['dispatch']
}

export const WalletConnectModalManager: FC<Props> = ({
  state: { activeModal, modalData, web3wallet },
  dispatch,
}) => {
  const handleClose = () => dispatch({ type: WalletConnectActionType.CLEAR_MODAL })

  const proposal = modalData?.proposal

  switch (activeModal) {
    case WalletConnectModal.sessionProposal:
      return proposal && web3wallet ? (
        <SessionProposalModal
          isOpen={true}
          onClose={handleClose}
          proposal={proposal}
          web3wallet={web3wallet}
          dispatch={dispatch}
        />
      ) : null
    default:
      return null
  }
}
