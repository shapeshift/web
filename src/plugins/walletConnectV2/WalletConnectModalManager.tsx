import { SessionProposalModal } from 'plugins/walletConnectV2/components/modal/SessionProposal'
import type { WalletConnectContextType } from 'plugins/walletConnectV2/types'
import { WalletConnectActionType, WalletConnectModal } from 'plugins/walletConnectV2/types'
import type { FC } from 'react'

type Props = {
  state: WalletConnectContextType['state']
  dispatch: WalletConnectContextType['dispatch']
}

export const WalletConnectModalManager: FC<Props> = ({
  state: { activeModal, modalData },
  dispatch,
}) => {
  const handleClose = () => {
    dispatch({ type: WalletConnectActionType.CLEAR_MODAL })
  }
  switch (activeModal) {
    case WalletConnectModal.sessionProposal:
      const proposal = modalData?.proposal
      return proposal ? (
        <SessionProposalModal isOpen={true} onClose={handleClose} proposal={proposal} />
      ) : null
    default:
      return null
  }
}
