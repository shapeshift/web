import { Modal, ModalContent } from '@chakra-ui/modal'
import { HStack, ModalCloseButton, ModalHeader, ModalOverlay, VStack } from '@chakra-ui/react'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { SessionTypes } from '@walletconnect/types'
import {
  extractConnectedAccounts,
  getWalletAccountFromParams,
} from 'plugins/walletConnectToDapps/utils'
import { SessionProposalModal } from 'plugins/walletConnectToDapps/v2/components/modals/SessionProposal'
import { SignMessageConfirmationModal } from 'plugins/walletConnectToDapps/v2/components/modals/SignMessageConfirmation'
import { SignTypedDataConfirmation } from 'plugins/walletConnectToDapps/v2/components/modals/SignTypedDataConfirmation'
import { TransactionConfirmation } from 'plugins/walletConnectToDapps/v2/components/modals/TransactionConfirmation'
import type {
  CustomTransactionData,
  EthSendTransactionCallRequest,
  EthSignCallRequest,
  EthSignTransactionCallRequest,
  EthSignTypedDataCallRequest,
  WalletConnectAction,
  WalletConnectContextType,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/v2/types'
import { WalletConnectActionType, WalletConnectModal } from 'plugins/walletConnectToDapps/v2/types'
import {
  approveEIP155Request,
  rejectEIP155Request,
} from 'plugins/walletConnectToDapps/v2/utils/EIP155RequestHandlerUtil'
import type { Dispatch, FC } from 'react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertUnreachable } from 'lib/utils'
import { selectPortfolioAccountMetadata } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

type WalletConnectModalManagerProps = WalletConnectContextType
type SessionProposalState = Required<Omit<WalletConnectState, 'session'>> & {
  session: SessionTypes.Struct
}

export type WalletConnectSessionModalProps = {
  dispatch: Dispatch<WalletConnectAction>
  state: SessionProposalState
  onClose(): void
}

export type WalletConnectRequestModalProps<T> = {
  dispatch: Dispatch<WalletConnectAction>
  state: Required<WalletConnectState<T>>
  onConfirm(customTransactionData?: CustomTransactionData): Promise<void>
  onReject(): Promise<void>
}

const isSessionProposalState = (state: WalletConnectState): state is SessionProposalState => {
  return !!(state.modalData && state.web3wallet && state.activeModal)
}

export const WalletConnectModalManager: FC<WalletConnectModalManagerProps> = ({
  state,
  dispatch,
}) => {
  const { activeModal, web3wallet, session } = state
  const wallet = useWallet().state.wallet
  const accountMetadataById = useAppSelector(selectPortfolioAccountMetadata)

  const handleClose = () => dispatch({ type: WalletConnectActionType.CLEAR_MODAL })
  const requestEvent = state.modalData?.requestEvent
  const connectedAccounts = extractConnectedAccounts(session)
  const accountId = getWalletAccountFromParams(connectedAccounts, requestEvent?.params)
  const accountMetadata = accountMetadataById[accountId]
  const chainId = requestEvent?.params.chainId
  const chainAdapter = chainId && getChainAdapterManager().get(chainId)

  const handleConfirmEIP155Request = async (customTransactionData?: CustomTransactionData) => {
    if (!requestEvent || !chainAdapter || !wallet || !chainAdapter || !web3wallet) return

    const topic = requestEvent.topic
    const response = await approveEIP155Request({
      wallet,
      requestEvent,
      chainAdapter: chainAdapter as unknown as EvmBaseAdapter<EvmChainId>,
      accountMetadata,
      customTransactionData,
      accountId,
    })
    await web3wallet.respondSessionRequest({
      topic,
      response,
    })
    handleClose()
  }

  const handleRejectEIP155Request = async () => {
    if (!requestEvent || !web3wallet) return

    const topic = requestEvent.topic
    const response = rejectEIP155Request(requestEvent)
    await web3wallet.respondSessionRequest({
      topic,
      response,
    })
    handleClose()
  }

  if (!web3wallet || !activeModal || !isSessionProposalState(state)) return null

  const modalContent = (() => {
    switch (activeModal) {
      case WalletConnectModal.sessionProposal:
        return <SessionProposalModal onClose={handleClose} dispatch={dispatch} state={state} />
      case WalletConnectModal.signMessageConfirmation:
        return (
          <SignMessageConfirmationModal
            onConfirm={handleConfirmEIP155Request}
            onReject={handleRejectEIP155Request}
            dispatch={dispatch}
            state={state as Required<WalletConnectState<EthSignCallRequest>>}
          />
        )
      case WalletConnectModal.signTypedDataConfirmation:
        return (
          <SignTypedDataConfirmation
            onConfirm={handleConfirmEIP155Request}
            onReject={handleRejectEIP155Request}
            dispatch={dispatch}
            state={state as Required<WalletConnectState<EthSignTypedDataCallRequest>>}
          />
        )
      case WalletConnectModal.signTransactionConfirmation:
      case WalletConnectModal.sendTransactionConfirmation:
        return (
          <TransactionConfirmation
            onConfirm={handleConfirmEIP155Request}
            onReject={handleRejectEIP155Request}
            dispatch={dispatch}
            state={
              state as Required<
                WalletConnectState<EthSendTransactionCallRequest | EthSignTransactionCallRequest>
              >
            }
          />
        )
      default:
        assertUnreachable(activeModal)
    }
  })()

  const modalWrapper = (content: JSX.Element) => (
    <Modal isOpen={!!activeModal} onClose={handleClose} variant='header-nav'>
      <ModalOverlay />
      <ModalContent
        width='full'
        borderRadius={{ base: 0, md: 'xl' }}
        minWidth={{ base: '100%', md: '500px' }}
        maxWidth={{ base: 'full', md: '500px' }}
      >
        <ModalHeader py={2}>
          <HStack alignItems='center' spacing={2}>
            <WalletConnectIcon />
            <Text fontSize='md' translation='plugins.walletConnectToDapps.modal.title' flex={1} />
            <ModalCloseButton position='static' />
          </HStack>
        </ModalHeader>
        <VStack p={6} spacing={6} alignItems='stretch'>
          {content}
        </VStack>
      </ModalContent>
    </Modal>
  )

  return modalWrapper(modalContent)
}
