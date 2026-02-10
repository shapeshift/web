import {
  assertGetCowNetwork,
  signCowMessage,
  signCowOrderCancellation,
} from '@shapeshiftoss/swapper'
import { EcdsaSigningScheme } from '@shapeshiftoss/types'
import type { DynamicToolUIPart } from 'ai'
import type { TypedData } from 'eip-712'
import { current } from 'immer'
import { useEffect, useRef } from 'react'
import { useTranslate } from 'react-polyglot'

import { agenticChatSlice } from '../../../state/slices/agenticChatSlice/agenticChatSlice'
import type { PersistedToolState } from '../../../state/slices/agenticChatSlice/types'
import {
  selectFirstAccountIdByChainId,
  selectPortfolioAccountMetadataByAccountId,
} from '../../../state/slices/portfolioSlice/selectors'
import { useAppDispatch, useAppSelector } from '../../../state/store'
import { getToolStateStatus, validateExecutionContext } from '../lib/executionUtils'
import { createStepPhaseMap, getStepStatus, StepStatus } from '../lib/stepUtils'
import type { CancelLimitOrderOutput } from '../types/toolOutput'
import { useToolExecutionEffect } from './useToolExecutionEffect'

import { getConfig } from '@/config'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'

export enum CancelLimitOrderStep {
  PREPARE = 0,
  SIGN = 1,
  SUBMIT = 2,
  COMPLETE = 3,
}

export { StepStatus }

const CANCEL_LIMIT_ORDER_PHASES = createStepPhaseMap<CancelLimitOrderStep>({
  [CancelLimitOrderStep.PREPARE]: 'preparation_complete',
  [CancelLimitOrderStep.SIGN]: 'sign_complete',
  [CancelLimitOrderStep.SUBMIT]: 'submit_complete',
})

type CancelLimitOrderState = {
  currentStep: CancelLimitOrderStep
  completedSteps: CancelLimitOrderStep[]
  signature?: string
  error?: string
  failedStep?: CancelLimitOrderStep
}

const initialCancelLimitOrderState: CancelLimitOrderState = {
  currentStep: CancelLimitOrderStep.PREPARE,
  completedSteps: [],
}

function stateToPersistedState(
  toolCallId: string,
  conversationId: string,
  state: CancelLimitOrderState,
  toolOutput: CancelLimitOrderOutput | null,
  isTerminal?: boolean,
): PersistedToolState {
  return {
    toolCallId,
    conversationId,
    toolType: 'cancel_limit_order',
    timestamp: Date.now(),
    phases: CANCEL_LIMIT_ORDER_PHASES.toPhases(state.completedSteps, state.error),
    meta: {
      ...(state.signature && { signature: state.signature }),
      ...(state.error && { error: state.error }),
      ...(state.failedStep !== undefined && { failedStep: state.failedStep }),
    },
    ...(toolOutput && { toolOutput }),
    isTerminal,
  }
}

function persistedStateToState(persisted: PersistedToolState): CancelLimitOrderState {
  const completedSteps = CANCEL_LIMIT_ORDER_PHASES.fromPhases(persisted.phases)
  const hasError = persisted.phases.includes('error')
  return {
    currentStep: hasError
      ? (persisted.meta.failedStep as CancelLimitOrderStep)
      : CancelLimitOrderStep.COMPLETE,
    completedSteps,
    signature: persisted.meta.signature as string | undefined,
    error: hasError ? (persisted.meta.error as string) : undefined,
    failedStep: persisted.meta.failedStep as CancelLimitOrderStep | undefined,
  }
}

export type CancelLimitOrderStepInfo = {
  step: CancelLimitOrderStep
  status: StepStatus
}

type UseCancelLimitOrderExecutionResult = {
  steps: CancelLimitOrderStepInfo[]
  error?: string
  signature?: string
}

export const useCancelLimitOrderExecution = (
  toolCallId: string,
  toolState: DynamicToolUIPart['state'],
  data: CancelLimitOrderOutput | null,
): UseCancelLimitOrderExecutionResult => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
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

  const chainId = data?.chainId ? `eip155:${data.chainId}` : undefined
  const accountId = useAppSelector(state =>
    chainId ? selectFirstAccountIdByChainId(state, chainId) : undefined,
  )
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
    initialCancelLimitOrderState,
    async (cancelData, setState) => {
      let signature: string | undefined

      try {
        const { wallet, accountMetadata: validAccountMetadata } = validateExecutionContext(
          walletState,
          accountId,
          accountMetadata,
        )

        const { orderId, chainId } = cancelData

        setState(draft => {
          if (!draft.completedSteps.includes(CancelLimitOrderStep.PREPARE)) {
            draft.completedSteps.push(CancelLimitOrderStep.PREPARE)
          }
          draft.currentStep = CancelLimitOrderStep.SIGN
          draft.error = undefined
        })

        const chainIdString = `eip155:${chainId}`

        const signMessage = async (typedData: TypedData) => {
          return await signCowMessage(
            typedData,
            assertGetEvmChainAdapter(chainIdString),
            validAccountMetadata,
            wallet,
          )
        }

        signature = await signCowOrderCancellation(orderId, chainIdString, signMessage)

        setState(draft => {
          draft.signature = signature
          if (!draft.completedSteps.includes(draft.currentStep)) {
            draft.completedSteps.push(draft.currentStep)
          }
          draft.currentStep = CancelLimitOrderStep.SUBMIT
          draft.error = undefined
        })

        const config = getConfig()
        const baseUrl = config.VITE_COWSWAP_BASE_URL
        const cowNetwork = assertGetCowNetwork(chainIdString)
        const orderCancellationPayload = {
          orderUids: [orderId],
          signature,
          signingScheme: EcdsaSigningScheme.EIP712,
        }

        const response = await fetch(`${baseUrl}/${cowNetwork}/api/v1/orders`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderCancellationPayload),
        })

        if (!response.ok) {
          throw new Error(`Failed to cancel order: ${response.statusText}`)
        }

        setState(draft => {
          if (!draft.completedSteps.includes(draft.currentStep)) {
            draft.completedSteps.push(draft.currentStep)
          }
          draft.currentStep = CancelLimitOrderStep.COMPLETE
          draft.error = undefined
        })

        const finalState: CancelLimitOrderState = {
          currentStep: CancelLimitOrderStep.COMPLETE,
          completedSteps: [
            CancelLimitOrderStep.PREPARE,
            CancelLimitOrderStep.SIGN,
            CancelLimitOrderStep.SUBMIT,
          ],
          signature,
        }
        const persisted = stateToPersistedState(
          toolCallId,
          activeConversationId ?? '',
          finalState,
          cancelData,
          true,
        )
        dispatch(agenticChatSlice.actions.persistTransaction(persisted))

        toast({
          title: translate('agenticChat.agenticChatTools.cancelLimitOrder.success.title'),
          description: translate(
            'agenticChat.agenticChatTools.cancelLimitOrder.success.description',
          ),
          status: 'success',
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        let errorState: CancelLimitOrderState | undefined
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
      { step: CancelLimitOrderStep.PREPARE, status: preparationStepStatus },
      { step: CancelLimitOrderStep.SIGN, status: getStepStatus(CancelLimitOrderStep.SIGN, state) },
      {
        step: CancelLimitOrderStep.SUBMIT,
        status: getStepStatus(CancelLimitOrderStep.SUBMIT, state),
      },
    ],
    error: state.error,
    signature: state.signature,
  }
}
