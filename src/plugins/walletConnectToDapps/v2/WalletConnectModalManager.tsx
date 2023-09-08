import {
  HStack,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  VStack,
} from '@chakra-ui/react'
import { formatJsonRpcError } from '@json-rpc-tools/utils'
import type {
  ChainAdapter,
  CosmosSdkChainId,
  EvmBaseAdapter,
  EvmChainId,
} from '@shapeshiftoss/chain-adapters'
import type { SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { CosmosSignMessageConfirmationModal } from 'plugins/walletConnectToDapps/v2/components/modals/CosmosSignMessageConfirmation'
import { EIP155SignMessageConfirmationModal } from 'plugins/walletConnectToDapps/v2/components/modals/EIP155SignMessageConfirmation'
import { EIP155SignTypedDataConfirmation } from 'plugins/walletConnectToDapps/v2/components/modals/EIP155SignTypedDataConfirmation'
import { EIP155TransactionConfirmation } from 'plugins/walletConnectToDapps/v2/components/modals/EIP155TransactionConfirmation'
import { SessionProposalModal } from 'plugins/walletConnectToDapps/v2/components/modals/SessionProposal'
import { useWalletConnectState } from 'plugins/walletConnectToDapps/v2/hooks/useWalletConnectState'
import type {
  CosmosSignAminoCallRequest,
  CosmosSignDirectCallRequest,
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
import { approveCosmosRequest } from 'plugins/walletConnectToDapps/v2/utils/CosmosRequestHandlerUtil'
import { approveEIP155Request } from 'plugins/walletConnectToDapps/v2/utils/EIP155RequestHandlerUtil'
import type { Dispatch, FC } from 'react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertUnreachable } from 'lib/utils'

type WalletConnectModalManagerProps = WalletConnectContextType

// A session must be defined in a session proposal state
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
  onConfirm(): Promise<void>
  onReject(): Promise<void>
}

const isSessionProposalState = (state: WalletConnectState): state is SessionProposalState =>
  !!(state.modalData && state.web3wallet && state.activeModal)

export const WalletConnectModalManager: FC<WalletConnectModalManagerProps> = ({
  state,
  dispatch,
}) => {
  const wallet = useWallet().state.wallet
  const { chainAdapter, requestEvent, accountMetadata, accountId } = useWalletConnectState(state)

  const { activeModal, web3wallet } = state

  const handleClose = () => dispatch({ type: WalletConnectActionType.CLEAR_MODAL })

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

  const handleConfirmCosmosRequest = async (customTransactionData?: CustomTransactionData) => {
    if (!requestEvent || !chainAdapter || !wallet || !chainAdapter || !web3wallet) return

    const topic = requestEvent.topic
    const response = await approveCosmosRequest({
      wallet,
      requestEvent,
      chainAdapter: chainAdapter as ChainAdapter<CosmosSdkChainId>,
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

  const handleRejectRequest = async () => {
    if (!requestEvent || !web3wallet) return

    const topic = requestEvent.topic
    const { id } = requestEvent
    const response = formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)

    await web3wallet.respondSessionRequest({
      topic,
      response,
    })
    handleClose()
  }

  if (!web3wallet || !activeModal || !isSessionProposalState(state)) return null

  const modalContent = (() => {
    switch (activeModal) {
      case WalletConnectModal.SessionProposal:
        return <SessionProposalModal onClose={handleClose} dispatch={dispatch} state={state} />
      case WalletConnectModal.SignEIP155MessageConfirmation:
        return (
          <EIP155SignMessageConfirmationModal
            onConfirm={handleConfirmEIP155Request}
            onReject={handleRejectRequest}
            dispatch={dispatch}
            state={state as Required<WalletConnectState<EthSignCallRequest>>}
          />
        )
      case WalletConnectModal.SignEIP155TypedDataConfirmation:
        return (
          <EIP155SignTypedDataConfirmation
            onConfirm={handleConfirmEIP155Request}
            onReject={handleRejectRequest}
            dispatch={dispatch}
            state={state as Required<WalletConnectState<EthSignTypedDataCallRequest>>}
          />
        )
      case WalletConnectModal.SignEIP155TransactionConfirmation:
      case WalletConnectModal.SendEIP155TransactionConfirmation:
        return (
          <EIP155TransactionConfirmation
            onConfirm={handleConfirmEIP155Request}
            onReject={handleRejectRequest}
            dispatch={dispatch}
            state={
              state as Required<
                WalletConnectState<EthSendTransactionCallRequest | EthSignTransactionCallRequest>
              >
            }
          />
        )
      case WalletConnectModal.SendCosmosTransactionConfirmation:
        return (
          <CosmosSignMessageConfirmationModal
            onConfirm={handleConfirmCosmosRequest}
            onReject={handleRejectRequest}
            dispatch={dispatch}
            state={
              state as Required<
                WalletConnectState<CosmosSignDirectCallRequest | CosmosSignAminoCallRequest>
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
