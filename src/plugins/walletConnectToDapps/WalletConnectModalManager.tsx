import {
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  VStack,
} from '@chakra-ui/react'
import { formatJsonRpcError } from '@json-rpc-tools/utils'
import type { SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { CosmosSignMessageConfirmationModal } from 'plugins/walletConnectToDapps/components/modals/CosmosSignMessageConfirmation'
import { EIP155SignMessageConfirmationModal } from 'plugins/walletConnectToDapps/components/modals/EIP155SignMessageConfirmation'
import { EIP155SignTypedDataConfirmation } from 'plugins/walletConnectToDapps/components/modals/EIP155SignTypedDataConfirmation'
import { EIP155TransactionConfirmation } from 'plugins/walletConnectToDapps/components/modals/EIP155TransactionConfirmation'
import { SessionProposalModal } from 'plugins/walletConnectToDapps/components/modals/SessionProposal'
import { useWalletConnectState } from 'plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  CosmosSignAminoCallRequest,
  CosmosSignDirectCallRequest,
  CustomTransactionData,
  EthSendTransactionCallRequest,
  EthSignCallRequest,
  EthSignTransactionCallRequest,
  EthSignTypedDataCallRequest,
  SessionProposalRef,
  WalletConnectAction,
  WalletConnectContextType,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/types'
import { WalletConnectActionType, WalletConnectModal } from 'plugins/walletConnectToDapps/types'
import { approveCosmosRequest } from 'plugins/walletConnectToDapps/utils/CosmosRequestHandlerUtil'
import { approveEIP155Request } from 'plugins/walletConnectToDapps/utils/EIP155RequestHandlerUtil'
import type { Dispatch, FC } from 'react'
import { useCallback, useMemo, useRef } from 'react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertUnreachable } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'

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
  topic: string
  onConfirm(): Promise<void>
  onReject(): Promise<void>
}

const borderRadiusProp = { base: 0, md: 'xl' }
const minWidthProp = { base: '100%', md: '500px' }
const maxWidthProp = { base: 'full', md: '500px' }

const isSessionProposalState = (state: WalletConnectState): state is SessionProposalState =>
  !!(state.modalData && state.web3wallet && state.activeModal)

export const WalletConnectModalManager: FC<WalletConnectModalManagerProps> = ({
  state,
  dispatch,
}) => {
  const { wallet, isConnected } = useWallet().state
  const sessionProposalRef = useRef<SessionProposalRef>(null)
  const { chainId, requestEvent, accountMetadata, accountId } = useWalletConnectState(state)

  const { activeModal, web3wallet } = state

  const handleClose = useCallback(
    () => dispatch({ type: WalletConnectActionType.CLEAR_MODAL }),
    [dispatch],
  )

  const topic = requestEvent?.topic

  const handleConfirmEIP155Request = useCallback(
    async (customTransactionData?: CustomTransactionData) => {
      if (!requestEvent || !chainId || !wallet || !web3wallet || !topic) {
        return
      }

      const chainAdapter = assertGetEvmChainAdapter(chainId)

      const response = await approveEIP155Request({
        wallet,
        requestEvent,
        chainAdapter,
        accountMetadata,
        customTransactionData,
        accountId,
      })
      await web3wallet.respondSessionRequest({
        topic,
        response,
      })
      handleClose()
    },
    [accountId, accountMetadata, chainId, handleClose, requestEvent, topic, wallet, web3wallet],
  )

  const handleConfirmCosmosRequest = useCallback(
    async (customTransactionData?: CustomTransactionData) => {
      if (!requestEvent || !chainId || !wallet || !web3wallet || !topic) {
        return
      }

      const chainAdapter = assertGetCosmosSdkChainAdapter(chainId)

      const response = await approveCosmosRequest({
        wallet,
        requestEvent,
        chainAdapter,
        accountMetadata,
        customTransactionData,
        accountId,
      })
      await web3wallet.respondSessionRequest({
        topic,
        response,
      })
      handleClose()
    },
    [accountId, accountMetadata, chainId, handleClose, requestEvent, topic, wallet, web3wallet],
  )

  const handleRejectRequest = useCallback(async () => {
    if (!requestEvent || !web3wallet || !topic) return

    const { id } = requestEvent
    const response = formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)

    await web3wallet.respondSessionRequest({
      topic,
      response,
    })
  }, [requestEvent, topic, web3wallet])

  const handleRejectRequestAndClose = useCallback(async () => {
    switch (activeModal) {
      case WalletConnectModal.SessionProposal:
        await sessionProposalRef.current?.handleReject()
        break
      case WalletConnectModal.SignEIP155MessageConfirmation:
      case WalletConnectModal.SignEIP155TypedDataConfirmation:
      case WalletConnectModal.SignEIP155TransactionConfirmation:
      case WalletConnectModal.SendEIP155TransactionConfirmation:
      case WalletConnectModal.SendCosmosTransactionConfirmation:
        await handleRejectRequest()
        break
      case undefined:
        break
      default:
        assertUnreachable(activeModal)
    }

    handleClose()
  }, [activeModal, handleClose, handleRejectRequest])

  const modalContent = useMemo(() => {
    if (!web3wallet || !activeModal || !isSessionProposalState(state)) return null
    switch (activeModal) {
      case WalletConnectModal.SessionProposal:
        return (
          <SessionProposalModal
            onClose={handleClose}
            dispatch={dispatch}
            state={state}
            ref={sessionProposalRef}
          />
        )
      case WalletConnectModal.SignEIP155MessageConfirmation:
        if (!topic) return null
        return (
          <EIP155SignMessageConfirmationModal
            onConfirm={handleConfirmEIP155Request}
            onReject={handleRejectRequestAndClose}
            dispatch={dispatch}
            state={state as Required<WalletConnectState<EthSignCallRequest>>}
            topic={topic}
          />
        )
      case WalletConnectModal.SignEIP155TypedDataConfirmation:
        if (!topic) return null
        return (
          <EIP155SignTypedDataConfirmation
            onConfirm={handleConfirmEIP155Request}
            onReject={handleRejectRequestAndClose}
            dispatch={dispatch}
            state={state as Required<WalletConnectState<EthSignTypedDataCallRequest>>}
            topic={topic}
          />
        )
      case WalletConnectModal.SignEIP155TransactionConfirmation:
      case WalletConnectModal.SendEIP155TransactionConfirmation:
        if (!topic) return null
        return (
          <EIP155TransactionConfirmation
            onConfirm={handleConfirmEIP155Request}
            onReject={handleRejectRequestAndClose}
            dispatch={dispatch}
            state={
              state as Required<
                WalletConnectState<EthSendTransactionCallRequest | EthSignTransactionCallRequest>
              >
            }
            topic={topic}
          />
        )
      case WalletConnectModal.SendCosmosTransactionConfirmation:
        if (!topic) return null
        return (
          <CosmosSignMessageConfirmationModal
            onConfirm={handleConfirmCosmosRequest}
            onReject={handleRejectRequestAndClose}
            dispatch={dispatch}
            state={
              state as Required<
                WalletConnectState<CosmosSignDirectCallRequest | CosmosSignAminoCallRequest>
              >
            }
            topic={topic}
          />
        )
      default:
        assertUnreachable(activeModal)
    }
  }, [
    activeModal,
    dispatch,
    handleClose,
    handleConfirmCosmosRequest,
    handleConfirmEIP155Request,
    handleRejectRequestAndClose,
    state,
    topic,
    web3wallet,
  ])

  // automatically reject requests that are received without wallet connected
  if (activeModal !== undefined && !isConnected) {
    void handleRejectRequestAndClose()
    return null
  }

  if (modalContent === null) return null

  return (
    <Modal
      isOpen={!!activeModal}
      onClose={handleRejectRequestAndClose}
      variant='header-nav'
      scrollBehavior='inside'
      preserveScrollBarGap={true}
    >
      <ModalOverlay />
      <ModalContent
        width='full'
        borderRadius={borderRadiusProp}
        minWidth={minWidthProp}
        maxWidth={maxWidthProp}
      >
        <ModalHeader py={2}>
          <HStack alignItems='center' spacing={2}>
            <WalletConnectIcon />
            <Text fontSize='md' translation='plugins.walletConnectToDapps.modal.title' flex={1} />
            <ModalCloseButton position='static' />
          </HStack>
        </ModalHeader>
        <ModalBody p={0}>
          <VStack p={6} spacing={6} alignItems='stretch'>
            {modalContent}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
