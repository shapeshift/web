import { assertGetViemClient } from '@shapeshiftoss/contracts'
import { signCowMessage } from '@shapeshiftoss/swapper'
import type { DynamicToolUIPart } from 'ai'
import type { TypedData } from 'eip-712'
import { current } from 'immer'
import { useEffect, useRef } from 'react'
import type { Hash } from 'viem'
import { getAddress } from 'viem'

import { agenticChatSlice } from '../../../state/slices/agenticChatSlice/agenticChatSlice'
import type { PersistedToolState } from '../../../state/slices/agenticChatSlice/types'
import { selectPortfolioAccountMetadataByAccountId } from '../../../state/slices/portfolioSlice/selectors'
import { useAppDispatch, useAppSelector } from '../../../state/store'
import type { CowSigningData } from '../lib/cowConstants'
import { getCowNetwork } from '../lib/cowConstants'
import { getToolStateStatus, validateExecutionContext } from '../lib/executionUtils'
import { createStepPhaseMap, getStepStatus, StepStatus } from '../lib/stepUtils'
import { executeEvmTransaction } from '../lib/walletIntegration'
import type { CreateLimitOrderOutput } from '../types/toolOutput'
import { useToolExecutionEffect } from './useToolExecutionEffect'

import { getConfig } from '@/config'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'

export enum CreateLimitOrderStep {
  PREPARE = 0,
  APPROVAL = 1,
  APPROVAL_CONFIRMATION = 2,
  SIGN = 3,
  SUBMIT = 4,
  COMPLETE = 5,
}

export { StepStatus }

const CREATE_LIMIT_ORDER_PHASES = createStepPhaseMap<CreateLimitOrderStep>({
  [CreateLimitOrderStep.PREPARE]: 'preparation_complete',
  [CreateLimitOrderStep.APPROVAL]: 'approval_complete',
  [CreateLimitOrderStep.APPROVAL_CONFIRMATION]: 'approval_confirmation_complete',
  [CreateLimitOrderStep.SIGN]: 'sign_complete',
  [CreateLimitOrderStep.SUBMIT]: 'submit_complete',
})

type CreateLimitOrderState = {
  currentStep: CreateLimitOrderStep
  completedSteps: CreateLimitOrderStep[]
  approvalTxHash?: string
  signature?: string
  trackingUrl?: string
  error?: string
  failedStep?: CreateLimitOrderStep
}

const initialCreateLimitOrderState: CreateLimitOrderState = {
  currentStep: CreateLimitOrderStep.PREPARE,
  completedSteps: [],
}

function stateToPersistedState(
  toolCallId: string,
  conversationId: string,
  state: CreateLimitOrderState,
  toolOutput: CreateLimitOrderOutput | null,
): PersistedToolState {
  return {
    toolCallId,
    conversationId,
    toolType: 'limit_order',
    timestamp: Date.now(),
    phases: CREATE_LIMIT_ORDER_PHASES.toPhases(state.completedSteps, state.error),
    meta: {
      ...(state.approvalTxHash && { approvalTxHash: state.approvalTxHash }),
      ...(state.signature && { signature: state.signature }),
      ...(state.trackingUrl && { trackingUrl: state.trackingUrl }),
      ...(state.error && { error: state.error }),
      ...(state.failedStep !== undefined && { failedStep: state.failedStep }),
    },
    ...(toolOutput && { toolOutput }),
  }
}

function persistedStateToState(persisted: PersistedToolState): CreateLimitOrderState {
  const completedSteps = CREATE_LIMIT_ORDER_PHASES.fromPhases(persisted.phases)
  const hasError = persisted.phases.includes('error')
  return {
    currentStep: hasError
      ? (persisted.meta.failedStep as CreateLimitOrderStep)
      : CreateLimitOrderStep.COMPLETE,
    completedSteps,
    approvalTxHash: persisted.meta.approvalTxHash as string | undefined,
    signature: persisted.meta.signature as string | undefined,
    trackingUrl: persisted.meta.trackingUrl as string | undefined,
    error: hasError ? (persisted.meta.error as string) : undefined,
  }
}

export type CreateLimitOrderStepInfo = {
  step: CreateLimitOrderStep
  status: StepStatus
}

type UseCreateLimitOrderExecutionResult = {
  steps: CreateLimitOrderStepInfo[]
  error?: string
  approvalTxHash?: string
  signature?: string
  trackingUrl?: string
}

export const useCreateLimitOrderExecution = (
  toolCallId: string,
  toolState: DynamicToolUIPart['state'],
  data: CreateLimitOrderOutput | null,
): UseCreateLimitOrderExecutionResult => {
  const dispatch = useAppDispatch()
  const toast = useNotificationToast()
  const hasHydratedRef = useRef(false)
  const lastToolCallIdRef = useRef<string | undefined>(undefined)
  const { state: walletState } = useWallet()

  const activeConversationId = useAppSelector(agenticChatSlice.selectors.selectActiveConversationId)
  const hasRuntimeState = useAppSelector(state =>
    Boolean(state.agenticChat.runtimeToolStates[toolCallId]),
  )
  const persistedTransaction = useAppSelector(state =>
    agenticChatSlice.selectors.selectPersistedTransaction(state, toolCallId),
  )

  const accountId = data?.orderParams
    ? `eip155:${data.orderParams.chainId}:${data.orderParams.receiver}`
    : undefined
  const accountMetadata = useAppSelector(state =>
    accountId ? selectPortfolioAccountMetadataByAccountId(state, { accountId }) : undefined,
  )

  useEffect(() => {
    if (lastToolCallIdRef.current !== toolCallId) {
      hasHydratedRef.current = false
      lastToolCallIdRef.current = toolCallId
    }

    if (!hasHydratedRef.current && !hasRuntimeState && persistedTransaction) {
      const hydratedState = persistedStateToState(persistedTransaction)
      dispatch(
        agenticChatSlice.actions.initializeRuntimeState({ toolCallId, state: hydratedState }),
      )
      hasHydratedRef.current = true
    }
  }, [toolCallId, dispatch, hasRuntimeState, persistedTransaction])

  const { state } = useToolExecutionEffect(
    toolCallId,
    data,
    initialCreateLimitOrderState,
    async (orderOutput, setState) => {
      let approvalTxHash: string | undefined
      let signature: string | undefined

      try {
        const {
          wallet,
          accountId: validAccountId,
          accountMetadata: validAccountMetadata,
        } = validateExecutionContext(walletState, accountId, accountMetadata)

        const { needsApproval, approvalTx, orderParams, signingData } = orderOutput

        setState(draft => {
          if (!draft.completedSteps.includes(CreateLimitOrderStep.PREPARE)) {
            draft.completedSteps.push(CreateLimitOrderStep.PREPARE)
          }
          draft.currentStep = needsApproval
            ? CreateLimitOrderStep.APPROVAL
            : CreateLimitOrderStep.SIGN
          draft.error = undefined
        })

        if (needsApproval && approvalTx) {
          approvalTxHash = await executeEvmTransaction({
            tx: approvalTx,
            wallet,
            accountId: validAccountId,
            accountMetadata: validAccountMetadata,
          })

          setState(draft => {
            draft.approvalTxHash = approvalTxHash
            if (!draft.completedSteps.includes(CreateLimitOrderStep.APPROVAL)) {
              draft.completedSteps.push(CreateLimitOrderStep.APPROVAL)
            }
            draft.currentStep = CreateLimitOrderStep.APPROVAL_CONFIRMATION
          })

          const publicClient = assertGetViemClient(approvalTx.chainId)
          await publicClient.waitForTransactionReceipt({ hash: approvalTxHash as Hash })

          setState(draft => {
            if (!draft.completedSteps.includes(CreateLimitOrderStep.APPROVAL_CONFIRMATION)) {
              draft.completedSteps.push(CreateLimitOrderStep.APPROVAL_CONFIRMATION)
            }
            draft.currentStep = CreateLimitOrderStep.SIGN
          })
        }

        const chainId = `eip155:${orderParams.chainId}`

        // Ensure all addresses are checksummed for HDWallet compatibility
        const rawSigningData = signingData as TypedData

        const checksummedMessage = {
          ...rawSigningData.message,
          sellToken: getAddress(rawSigningData.message.sellToken as string),
          buyToken: getAddress(rawSigningData.message.buyToken as string),
          receiver: getAddress(rawSigningData.message.receiver as string),
        }

        const checksummedDomain = {
          ...rawSigningData.domain,
          verifyingContract: getAddress(rawSigningData.domain.verifyingContract as string),
        }

        // Add EIP712Domain to types for HDWallet compatibility
        const typedDataToSign: TypedData = {
          domain: checksummedDomain,
          types: {
            ...rawSigningData.types,
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
          },
          primaryType: rawSigningData.primaryType,
          message: checksummedMessage,
        }

        signature = await signCowMessage(
          typedDataToSign,
          assertGetEvmChainAdapter(chainId),
          validAccountMetadata,
          wallet,
        )

        setState(draft => {
          draft.signature = signature
          if (!draft.completedSteps.includes(CreateLimitOrderStep.SIGN)) {
            draft.completedSteps.push(CreateLimitOrderStep.SIGN)
          }
          draft.currentStep = CreateLimitOrderStep.SUBMIT
          draft.error = undefined
        })

        const config = getConfig()
        const baseUrl = config.VITE_COWSWAP_BASE_URL
        const networkName = getCowNetwork(orderParams.chainId)

        const orderPayload = {
          sellToken: orderParams.sellToken,
          buyToken: orderParams.buyToken,
          receiver: orderParams.receiver,
          sellAmount: orderParams.sellAmount,
          buyAmount: orderParams.buyAmount,
          validTo: orderParams.validTo,
          appData:
            (signingData as CowSigningData).message.appData ||
            '0x0000000000000000000000000000000000000000000000000000000000000000',
          feeAmount: '0',
          kind: 'sell',
          partiallyFillable: true,
          sellTokenBalance: 'erc20',
          buyTokenBalance: 'erc20',
          signingScheme: 'eip712',
          signature,
          from: orderParams.receiver,
        }

        const response = await fetch(`${baseUrl}/${networkName}/api/v1/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderPayload),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to create order: ${errorText}`)
        }

        // Persist successful state immediately after order creation succeeds
        const finalState: CreateLimitOrderState = {
          currentStep: CreateLimitOrderStep.COMPLETE,
          completedSteps: [
            CreateLimitOrderStep.PREPARE,
            ...(needsApproval
              ? [
                  CreateLimitOrderStep.APPROVAL,
                  CreateLimitOrderStep.APPROVAL_CONFIRMATION,
                  CreateLimitOrderStep.SIGN,
                  CreateLimitOrderStep.SUBMIT,
                ]
              : [CreateLimitOrderStep.SIGN, CreateLimitOrderStep.SUBMIT]),
          ],
          approvalTxHash,
          signature,
          trackingUrl: orderOutput.trackingUrl,
        }
        const persisted = stateToPersistedState(
          toolCallId,
          activeConversationId ?? '',
          finalState,
          orderOutput,
        )
        dispatch(agenticChatSlice.actions.persistTransaction(persisted))

        // Update runtime state
        setState(draft => {
          draft.trackingUrl = orderOutput.trackingUrl
          if (!draft.completedSteps.includes(CreateLimitOrderStep.SUBMIT)) {
            draft.completedSteps.push(CreateLimitOrderStep.SUBMIT)
          }
          draft.currentStep = CreateLimitOrderStep.COMPLETE
          draft.error = undefined
        })

        toast({
          title: 'Limit Order Created',
          description: 'Your limit order has been successfully created',
          status: 'success',
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        let errorState: CreateLimitOrderState | undefined
        setState(draft => {
          draft.error = errorMessage
          draft.failedStep = draft.currentStep
          errorState = current(draft)
        })

        if (errorState) {
          const persisted = stateToPersistedState(
            toolCallId,
            activeConversationId ?? '',
            errorState,
            data,
          )
          dispatch(agenticChatSlice.actions.persistTransaction(persisted))
        }
      }
    },
  )

  const preparationStepStatus = getToolStateStatus(toolState)

  return {
    steps: [
      { step: CreateLimitOrderStep.PREPARE, status: preparationStepStatus },
      {
        step: CreateLimitOrderStep.APPROVAL,
        status: getStepStatus(CreateLimitOrderStep.APPROVAL, state),
      },
      {
        step: CreateLimitOrderStep.APPROVAL_CONFIRMATION,
        status: getStepStatus(CreateLimitOrderStep.APPROVAL_CONFIRMATION, state),
      },
      { step: CreateLimitOrderStep.SIGN, status: getStepStatus(CreateLimitOrderStep.SIGN, state) },
      {
        step: CreateLimitOrderStep.SUBMIT,
        status: getStepStatus(CreateLimitOrderStep.SUBMIT, state),
      },
    ],
    error: state.error,
    approvalTxHash: state.approvalTxHash,
    signature: state.signature,
    trackingUrl: state.trackingUrl,
  }
}
