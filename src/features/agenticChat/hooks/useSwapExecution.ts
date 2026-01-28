import { CHAIN_NAMESPACE, fromChainId, toAccountId } from '@shapeshiftoss/caip'
import { assertGetViemClient } from '@shapeshiftoss/contracts'
import type { DynamicToolUIPart } from 'ai'
import { current } from 'immer'
import { useEffect, useRef } from 'react'
import type { Hash } from 'viem'

import { agenticChatSlice } from '../../../state/slices/agenticChatSlice/agenticChatSlice'
import type { PersistedToolState } from '../../../state/slices/agenticChatSlice/types'
import { selectPortfolioAccountMetadataByAccountId } from '../../../state/slices/portfolioSlice/selectors'
import { useAppDispatch, useAppSelector } from '../../../state/store'
import { getToolStateStatus, validateExecutionContext } from '../lib/executionUtils'
import { createStepPhaseMap, getStepStatus, StepStatus } from '../lib/stepUtils'
import { executeEvmTransaction, executeSolanaTransaction } from '../lib/walletIntegration'
import type { SwapOutput } from '../types/toolOutput'
import { useToolExecutionEffect } from './useToolExecutionEffect'

import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'

type SwapData = SwapOutput

export enum SwapStep {
  QUOTE = 0,
  APPROVAL = 1,
  APPROVAL_CONFIRMATION = 2,
  SWAP = 3,
  COMPLETE = 4,
}

export { StepStatus }

const SWAP_PHASES = createStepPhaseMap<SwapStep>({
  [SwapStep.QUOTE]: 'quote_complete',
  [SwapStep.APPROVAL]: 'approval_complete',
  [SwapStep.APPROVAL_CONFIRMATION]: 'approval_confirmation_complete',
  [SwapStep.SWAP]: 'swap_complete',
})

type SwapState = {
  currentStep: SwapStep
  completedSteps: SwapStep[]
  approvalTxHash?: string
  swapTxHash?: string
  error?: string
  failedStep?: SwapStep
}

const initialSwapState: SwapState = {
  currentStep: SwapStep.QUOTE,
  completedSteps: [],
}

function swapStateToPersistedState(
  toolCallId: string,
  conversationId: string,
  state: SwapState,
  swapOutput: SwapOutput | null,
): PersistedToolState {
  return {
    toolCallId,
    conversationId,
    toolType: 'swap',
    timestamp: Date.now(),
    phases: SWAP_PHASES.toPhases(state.completedSteps, state.error),
    meta: {
      ...(state.approvalTxHash && { approvalTxHash: state.approvalTxHash }),
      ...(state.swapTxHash && { swapTxHash: state.swapTxHash }),
      ...(state.error && { error: state.error }),
      ...(state.failedStep !== undefined && { failedStep: state.failedStep }),
    },
    ...(swapOutput && { toolOutput: swapOutput }),
  }
}

function persistedStateToSwapState(persisted: PersistedToolState): SwapState {
  return {
    currentStep: SwapStep.COMPLETE,
    completedSteps: SWAP_PHASES.fromPhases(persisted.phases),
    approvalTxHash: persisted.meta.approvalTxHash as string | undefined,
    swapTxHash: persisted.meta.swapTxHash as string | undefined,
    error: persisted.meta.error as string | undefined,
    failedStep: persisted.meta.failedStep as SwapStep | undefined,
  }
}

export type SwapStepInfo = {
  step: SwapStep
  status: StepStatus
}

type UseSwapExecutionResult = {
  steps: SwapStepInfo[]
  error?: string
  approvalTxHash?: string
  swapTxHash?: string
}

export const useSwapExecution = (
  toolCallId: string,
  toolState: DynamicToolUIPart['state'],
  swapData: SwapData | null,
): UseSwapExecutionResult => {
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

  const accountId = swapData
    ? toAccountId({ chainId: swapData.swapTx.chainId, account: swapData.swapTx.from })
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
      const hydratedState = persistedStateToSwapState(persistedTransaction)
      dispatch(
        agenticChatSlice.actions.initializeRuntimeState({ toolCallId, state: hydratedState }),
      )
      hasHydratedRef.current = true
    }
  }, [toolCallId, dispatch, hasRuntimeState, persistedTransaction])

  const { state } = useToolExecutionEffect(
    toolCallId,
    swapData,
    initialSwapState,
    async (data, setState) => {
      let approvalTxHash: string | undefined
      let swapTxHash: string | undefined

      try {
        const {
          wallet,
          accountId: validAccountId,
          accountMetadata: validAccountMetadata,
        } = validateExecutionContext(walletState, accountId, accountMetadata)

        const { needsApproval, approvalTx, swapTx } = data

        // Detect chain namespace
        const chainNamespace = fromChainId(swapTx.chainId).chainNamespace

        // Step 0: Quote (completed by backend)
        setState(draft => {
          if (!draft.completedSteps.includes(SwapStep.QUOTE)) {
            draft.completedSteps.push(SwapStep.QUOTE)
          }
          draft.currentStep = needsApproval ? SwapStep.APPROVAL : SwapStep.SWAP
          draft.error = undefined
        })

        // Step 1 & 2: Approval (if needed, EVM only)
        if (needsApproval && approvalTx && chainNamespace === CHAIN_NAMESPACE.Evm) {
          approvalTxHash = await executeEvmTransaction({
            tx: approvalTx,
            wallet,
            accountId: validAccountId,
            accountMetadata: validAccountMetadata,
          })

          setState(draft => {
            draft.approvalTxHash = approvalTxHash
            if (!draft.completedSteps.includes(SwapStep.APPROVAL)) {
              draft.completedSteps.push(SwapStep.APPROVAL)
            }
            draft.currentStep = SwapStep.APPROVAL_CONFIRMATION
          })

          // Wait for approval confirmation (EVM only)
          const publicClient = assertGetViemClient(approvalTx.chainId)
          await publicClient.waitForTransactionReceipt({ hash: approvalTxHash as Hash })

          setState(draft => {
            if (!draft.completedSteps.includes(SwapStep.APPROVAL_CONFIRMATION)) {
              draft.completedSteps.push(SwapStep.APPROVAL_CONFIRMATION)
            }
            draft.currentStep = SwapStep.SWAP
          })
        }

        // Step 3: Execute swap
        if (chainNamespace === CHAIN_NAMESPACE.Evm) {
          swapTxHash = await executeEvmTransaction({
            tx: swapTx,
            wallet,
            accountId: validAccountId,
            accountMetadata: validAccountMetadata,
          })
        } else if (chainNamespace === CHAIN_NAMESPACE.Solana) {
          swapTxHash = await executeSolanaTransaction({
            tx: swapTx,
            wallet,
            accountId: validAccountId,
            accountMetadata: validAccountMetadata,
          })
        } else {
          throw new Error(`Unsupported chain: ${chainNamespace}`)
        }

        setState(draft => {
          draft.swapTxHash = swapTxHash
          if (!draft.completedSteps.includes(SwapStep.SWAP)) {
            draft.completedSteps.push(SwapStep.SWAP)
          }
          draft.currentStep = SwapStep.COMPLETE
          draft.error = undefined
        })

        // Persist successful state
        const finalState: SwapState = {
          currentStep: SwapStep.COMPLETE,
          completedSteps: [
            SwapStep.QUOTE,
            ...(needsApproval
              ? [SwapStep.APPROVAL, SwapStep.APPROVAL_CONFIRMATION, SwapStep.SWAP]
              : [SwapStep.SWAP]),
          ],
          approvalTxHash,
          swapTxHash,
        }
        const persisted = swapStateToPersistedState(
          toolCallId,
          activeConversationId ?? '',
          finalState,
          data,
        )
        dispatch(agenticChatSlice.actions.persistTransaction(persisted))

        toast({
          title: 'Swap Successful',
          description: 'Your swap transaction has been completed',
          status: 'success',
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        let errorState: SwapState | undefined
        setState(draft => {
          draft.error = errorMessage
          draft.failedStep = draft.currentStep
          errorState = current(draft)
        })

        // Persist error state
        if (errorState) {
          const persisted = swapStateToPersistedState(
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

  const quoteStepStatus = getToolStateStatus(toolState)

  return {
    steps: [
      { step: SwapStep.QUOTE, status: quoteStepStatus },
      { step: SwapStep.APPROVAL, status: getStepStatus(SwapStep.APPROVAL, state) },
      {
        step: SwapStep.APPROVAL_CONFIRMATION,
        status: getStepStatus(SwapStep.APPROVAL_CONFIRMATION, state),
      },
      { step: SwapStep.SWAP, status: getStepStatus(SwapStep.SWAP, state) },
    ],
    error: state.error,
    approvalTxHash: state.approvalTxHash,
    swapTxHash: state.swapTxHash,
  }
}
