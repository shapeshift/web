import { CHAIN_NAMESPACE, fromChainId, toAccountId } from '@shapeshiftoss/caip'
import type { DynamicToolUIPart } from 'ai'
import { current } from 'immer'
import { useEffect, useRef } from 'react'
import { useTranslate } from 'react-polyglot'

import { agenticChatSlice } from '../../../state/slices/agenticChatSlice/agenticChatSlice'
import type { PersistedToolState } from '../../../state/slices/agenticChatSlice/types'
import { selectPortfolioAccountMetadataByAccountId } from '../../../state/slices/portfolioSlice/selectors'
import { useAppDispatch, useAppSelector } from '../../../state/store'
import { getToolStateStatus, validateExecutionContext } from '../lib/executionUtils'
import { createStepPhaseMap, getStepStatus, StepStatus } from '../lib/stepUtils'
import { executeEvmTransaction, executeSolanaTransaction } from '../lib/walletIntegration'
import type { SendOutput } from '../types/toolOutput'
import { useToolExecutionEffect } from './useToolExecutionEffect'

import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'

type SendData = SendOutput

export enum SendStep {
  PREPARATION = 0,
  SEND = 1,
  COMPLETE = 2,
}

export { StepStatus }

const SEND_PHASES = createStepPhaseMap<SendStep>({
  [SendStep.PREPARATION]: 'preparation_complete',
  [SendStep.SEND]: 'send_complete',
})

type SendState = {
  currentStep: SendStep
  completedSteps: SendStep[]
  sendTxHash?: string
  error?: string
  failedStep?: SendStep
}

const initialSendState: SendState = {
  currentStep: SendStep.PREPARATION,
  completedSteps: [],
}

function sendStateToPersistedState(
  toolCallId: string,
  conversationId: string,
  state: SendState,
  sendOutput: SendOutput | null,
  isTerminal?: boolean,
): PersistedToolState {
  return {
    toolCallId,
    conversationId,
    toolType: 'send',
    timestamp: Date.now(),
    phases: SEND_PHASES.toPhases(state.completedSteps, state.error),
    meta: {
      ...(state.sendTxHash && { sendTxHash: state.sendTxHash }),
      ...(state.error && { error: state.error }),
      ...(state.failedStep !== undefined && { failedStep: state.failedStep }),
    },
    ...(sendOutput && { toolOutput: sendOutput }),
    isTerminal,
  }
}

function persistedStateToSendState(persisted: PersistedToolState): SendState {
  return {
    currentStep: SendStep.COMPLETE,
    completedSteps: SEND_PHASES.fromPhases(persisted.phases),
    sendTxHash: persisted.meta.sendTxHash as string | undefined,
    error: persisted.meta.error as string | undefined,
    failedStep: persisted.meta.failedStep as SendStep | undefined,
  }
}

export type SendStepInfo = {
  step: SendStep
  status: StepStatus
}

type UseSendExecutionResult = {
  steps: SendStepInfo[]
  error?: string
  sendTxHash?: string
}

export const useSendExecution = (
  toolCallId: string,
  toolState: DynamicToolUIPart['state'],
  sendData: SendData | null,
): UseSendExecutionResult => {
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

  const accountId = sendData
    ? toAccountId({ chainId: sendData.tx.chainId, account: sendData.tx.from })
    : undefined
  const accountMetadata = useAppSelector(state =>
    accountId ? selectPortfolioAccountMetadataByAccountId(state, { accountId }) : undefined,
  )

  // Hydrate from persisted state
  useEffect(() => {
    if (lastToolCallIdRef.current !== toolCallId) {
      hasHydratedRef.current = false
      lastToolCallIdRef.current = toolCallId
    }

    if (!hasHydratedRef.current && !hasRuntimeState && persistedTransaction) {
      const hydratedState = persistedStateToSendState(persistedTransaction)
      dispatch(
        agenticChatSlice.actions.initializeRuntimeState({ toolCallId, state: hydratedState }),
      )
      hasHydratedRef.current = true
    }
  }, [toolCallId, dispatch, hasRuntimeState, persistedTransaction])

  const { state } = useToolExecutionEffect(
    toolCallId,
    sendData,
    initialSendState,
    async (data, setState) => {
      let sendTxHash: string | undefined

      try {
        const {
          wallet,
          accountId: validAccountId,
          accountMetadata: validAccountMetadata,
        } = validateExecutionContext(walletState, accountId, accountMetadata)

        const { tx } = data

        // Step 0: Preparation (completed by this point)
        setState(draft => {
          if (!draft.completedSteps.includes(SendStep.PREPARATION)) {
            draft.completedSteps.push(SendStep.PREPARATION)
          }
          draft.currentStep = SendStep.SEND
          draft.error = undefined
        })

        // Step 1: Send using ShapeShift's HDWallet system
        const chainNamespace = fromChainId(tx.chainId).chainNamespace

        if (chainNamespace === CHAIN_NAMESPACE.Evm) {
          sendTxHash = await executeEvmTransaction({
            tx,
            wallet,
            accountId: validAccountId,
            accountMetadata: validAccountMetadata,
          })
        } else if (chainNamespace === CHAIN_NAMESPACE.Solana) {
          sendTxHash = await executeSolanaTransaction({
            tx,
            wallet,
            accountId: validAccountId,
            accountMetadata: validAccountMetadata,
          })
        } else {
          throw new Error(`Unsupported chain: ${chainNamespace}`)
        }

        setState(draft => {
          draft.sendTxHash = sendTxHash
          if (!draft.completedSteps.includes(draft.currentStep)) {
            draft.completedSteps.push(draft.currentStep)
          }
          draft.currentStep = SendStep.COMPLETE
          draft.error = undefined
        })

        // Persist successful state
        const finalState: SendState = {
          currentStep: SendStep.COMPLETE,
          completedSteps: [SendStep.PREPARATION, SendStep.SEND],
          sendTxHash,
        }
        const persisted = sendStateToPersistedState(
          toolCallId,
          activeConversationId ?? '',
          finalState,
          data,
          true,
        )
        dispatch(agenticChatSlice.actions.persistTransaction(persisted))

        toast({
          title: translate('agenticChat.agenticChatTools.send.success.title'),
          description: translate('agenticChat.agenticChatTools.send.success.description'),
          status: 'success',
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        let errorState: SendState | undefined
        setState(draft => {
          draft.error = errorMessage
          draft.failedStep = draft.currentStep
          errorState = current(draft)
        })

        // Persist error state
        if (errorState) {
          const persisted = sendStateToPersistedState(
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
      { step: SendStep.PREPARATION, status: preparationStepStatus },
      { step: SendStep.SEND, status: getStepStatus(SendStep.SEND, state) },
    ],
    error: state.error,
    sendTxHash: state.sendTxHash,
  }
}
