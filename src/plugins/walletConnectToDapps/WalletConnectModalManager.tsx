import type { ModalProps } from '@chakra-ui/react'
import { formatJsonRpcError } from '@json-rpc-tools/utils'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import type { Dispatch, FC } from 'react'
import { useCallback, useMemo, useRef } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { Dialog } from '@/components/Modal/components/Dialog'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import { CosmosSignMessageConfirmationModal } from '@/plugins/walletConnectToDapps/components/modals/CosmosSignMessageConfirmation'
import { EIP155SignMessageConfirmationModal } from '@/plugins/walletConnectToDapps/components/modals/EIP155SignMessageConfirmation'
import { EIP155SignTypedDataConfirmation } from '@/plugins/walletConnectToDapps/components/modals/EIP155SignTypedDataConfirmation'
import { EIP155TransactionConfirmation } from '@/plugins/walletConnectToDapps/components/modals/EIP155TransactionConfirmation'
import { NoAccountsForChainModal } from '@/plugins/walletConnectToDapps/components/modals/NoAccountsForChainModal'
import { SendTransactionConfirmation } from '@/plugins/walletConnectToDapps/components/modals/SendTransactionConfirmation'
import { SessionAuthenticateConfirmation } from '@/plugins/walletConnectToDapps/components/modals/SessionAuthenticateConfirmation'
import { SessionProposalModal } from '@/plugins/walletConnectToDapps/components/modals/SessionProposal'
import { SessionProposalRoutes } from '@/plugins/walletConnectToDapps/components/modals/SessionProposalRoutes'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
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
} from '@/plugins/walletConnectToDapps/types'
import { WalletConnectActionType, WalletConnectModal } from '@/plugins/walletConnectToDapps/types'
import { approveCosmosRequest } from '@/plugins/walletConnectToDapps/utils/CosmosRequestHandlerUtil'
import { approveEIP155Request } from '@/plugins/walletConnectToDapps/utils/EIP155RequestHandlerUtil'
import { selectPortfolioAccountMetadata } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

enum SessionAuthRoutes {
  Overview = '/overview',
  ChooseAccount = '/choose-account',
}

const sessionProposalInitialEntries = [SessionProposalRoutes.Overview]

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
  dispatch?: Dispatch<WalletConnectAction>
  state: Required<WalletConnectState<T>>
  topic: string
  onConfirm(customTransactionData?: CustomTransactionData): Promise<void>
  onReject(): Promise<void>
}

const modalProps: Omit<ModalProps, 'children' | 'isOpen' | 'onClose'> = {
  size: 'md',
  scrollBehavior: 'inside',
  preserveScrollBarGap: true,
}

const isModalReady = (state: WalletConnectState): state is SessionProposalState =>
  !!(state.modalData && state.web3wallet && state.activeModal)

export const WalletConnectModalManager: FC<WalletConnectModalManagerProps> = ({
  state,
  dispatch,
}) => {
  const { wallet, isConnected } = useWallet().state
  const sessionProposalRef = useRef<SessionProposalRef>(null)
  const { chainId, requestEvent, accountMetadata, accountId } = useWalletConnectState(state)
  const portfolioAccountMetadata = useAppSelector(selectPortfolioAccountMetadata)

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

  const handleConfirmAuthRequest = useCallback(
    async (customTransactionData?: CustomTransactionData) => {
      if (!state.modalData?.request || !web3wallet || !wallet) return

      const authRequest = state.modalData.request as any
      const { authPayload } = authRequest.params

      // For auth, we need to use the first chain from the auth payload
      const authChainId = authPayload.chains?.[0] || chainId

      // Get the selected account from customTransactionData or fall back to default
      const selectedAccountId = customTransactionData?.accountId || accountId
      if (!selectedAccountId) return

      try {
        // Get the chain adapter for signing
        const chainAdapter = assertGetEvmChainAdapter(authChainId)

        // Format the auth message for signing
        const address = selectedAccountId.split(':')[2]
        const caipChainId = authPayload.chains?.[0] || authChainId
        const iss = `did:pkh:${caipChainId}:${address}`

        const message = web3wallet.formatAuthMessage({
          request: authPayload,
          iss,
        })

        // Get the account metadata for the selected account
        const selectedAccountMetadata = portfolioAccountMetadata[selectedAccountId]
        const bip44Params = selectedAccountMetadata?.bip44Params
        const addressNList = bip44Params
          ? toAddressNList(chainAdapter.getBip44Params(bip44Params))
          : []

        // Sign the message using the same format as EIP155RequestHandler
        const messageToSign = { addressNList, message }
        const input = { messageToSign, wallet }
        const signature = await chainAdapter.signMessage(input)

        if (!signature) throw new Error('Failed to sign message')

        // Ensure signature has 0x prefix
        const formattedSignature = signature.startsWith('0x') ? signature : `0x${signature}`

        // Build CACAO and approve - payload needs to include the iss field
        const cacaoPayload = {
          ...authPayload,
          iss,
        }

        const cacao = {
          h: { t: 'caip122' as const },
          p: cacaoPayload,
          s: { t: 'eip191' as const, s: formattedSignature },
        }

        const approvalResponse = await web3wallet.approveSessionAuthenticate({
          id: authRequest.id,
          auths: [cacao],
        })

        // Check if we got a session back and add it to state
        if (approvalResponse?.session) {
          dispatch({
            type: WalletConnectActionType.ADD_SESSION,
            payload: approvalResponse.session,
          })
        }

        handleClose()
      } catch (error) {
        console.error('Error approving auth request:', error)
        throw error
      }
    },
    [accountId, chainId, dispatch, handleClose, portfolioAccountMetadata, state.modalData, wallet, web3wallet],
  )

  const handleRejectAuthRequest = useCallback(async () => {
    if (!state.modalData?.request || !web3wallet) return

    const authRequest = state.modalData.request as any
    await web3wallet.rejectSessionAuthenticate({
      id: authRequest.id,
      reason: getSdkError('USER_REJECTED'),
    })
  }, [state.modalData, web3wallet])

  const handleRejectRequestAndClose = useCallback(async () => {
    switch (activeModal) {
      case WalletConnectModal.SessionProposal:
        await sessionProposalRef.current?.handleReject()
        break
      case WalletConnectModal.SessionAuthenticateConfirmation:
        await handleRejectAuthRequest()
        break
      case WalletConnectModal.SignEIP155MessageConfirmation:
      case WalletConnectModal.SignEIP155TypedDataConfirmation:
      case WalletConnectModal.SignEIP155TransactionConfirmation:
      case WalletConnectModal.SendEIP155TransactionConfirmation:
      case WalletConnectModal.SendCosmosTransactionConfirmation:
        await handleRejectRequest()
        break
      case WalletConnectModal.NoAccountsForChain:
        // No rejection needed, error already sent to dApp
        break
      case undefined:
        break
      default:
      // Temporary fix for TypeScript exhaustiveness check
      // assertUnreachable(activeModal)
    }

    handleClose()
  }, [activeModal, handleClose, handleRejectRequest, handleRejectAuthRequest])

  const modalContent = useMemo(() => {
    if (!web3wallet || !activeModal || !isModalReady(state)) return null
    switch (activeModal) {
      case WalletConnectModal.SessionProposal:
        return (
          <MemoryRouter initialEntries={sessionProposalInitialEntries}>
            <SessionProposalModal
              onClose={handleClose}
              dispatch={dispatch}
              state={state}
              ref={sessionProposalRef}
            />
          </MemoryRouter>
        )
      case WalletConnectModal.SessionAuthenticateConfirmation:
        return (
          <MemoryRouter initialEntries={[SessionAuthRoutes.Overview]}>
            <SessionAuthenticateConfirmation
              onConfirm={handleConfirmAuthRequest}
              onReject={handleRejectRequestAndClose}
              state={state}
              topic=''
            />
          </MemoryRouter>
        )
      case WalletConnectModal.SignEIP155MessageConfirmation:
        if (!topic) return null
        return (
          <EIP155SignMessageConfirmationModal
            onConfirm={handleConfirmEIP155Request}
            onReject={handleRejectRequestAndClose}
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
            state={state as Required<WalletConnectState<EthSignTypedDataCallRequest>>}
            topic={topic}
          />
        )
      case WalletConnectModal.SignEIP155TransactionConfirmation:
      case WalletConnectModal.SendEIP155TransactionConfirmation: {
        if (!topic) return null

        const requestParams = state.modalData?.requestEvent?.params.request.params
        const transaction = Array.isArray(requestParams) ? requestParams[0] : undefined

        if (!transaction || typeof transaction === 'string' || !('data' in transaction)) return null

        const isNativeSend = transaction.data === '0x'

        if (isNativeSend)
          return (
            <SendTransactionConfirmation
              onConfirm={handleConfirmEIP155Request}
              onReject={handleRejectRequestAndClose}
              state={state as Required<WalletConnectState<EthSendTransactionCallRequest>>}
              topic={topic}
            />
          )

        return (
          <EIP155TransactionConfirmation
            onConfirm={handleConfirmEIP155Request}
            onReject={handleRejectRequestAndClose}
            state={state as Required<WalletConnectState<EthSignTransactionCallRequest>>}
            topic={topic}
          />
        )
      }
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
      case WalletConnectModal.NoAccountsForChain:
        return <NoAccountsForChainModal onClose={handleClose} dispatch={dispatch} state={state} />
      default:
        // Temporary fix for TypeScript exhaustiveness check
        return null
      // assertUnreachable(activeModal)
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
    <Dialog isOpen={!!activeModal} onClose={handleRejectRequestAndClose} modalProps={modalProps}>
      {modalContent}
    </Dialog>
  )
}
