import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useRef, useState } from 'react'

import { executeWorkflowStep, getReadySteps } from '@/lib/workflows/executor'
import { WORKFLOW_TEMPLATES } from '@/lib/workflows/templates'
import type { WorkflowInstance, WorkflowStepStatus } from '@/lib/workflows/types'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { store } from '@/state/store'

import type { WorkflowPlanOutput } from '../types/toolOutput'

function buildInitialInstance(plan: WorkflowPlanOutput): WorkflowInstance {
  return {
    id: `workflow-${Date.now()}`,
    templateId: plan.templateId,
    parameterValues: plan.parameterValues,
    steps: plan.steps.map(s => ({ stepId: s.id, status: 'pending' })),
    status: 'pending_approval',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

type UseWorkflowExecutionResult = {
  instance: WorkflowInstance | null
  isApproved: boolean
  approve: () => void
  abort: () => void
  pendingSignatureStepId: string | null
  signStep: (stepId: string, txHash: string) => void
}

export function useWorkflowExecution(plan: WorkflowPlanOutput | null): UseWorkflowExecutionResult {
  const [instance, setInstance] = useState<WorkflowInstance | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [pendingSignatureStepId, setPendingSignatureStepId] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const prevOutputsRef = useRef<Record<string, unknown>>({})

  // Signature promise resolver — lets the executor await the user signing a tx
  const signatureResolverRef = useRef<((txHash: string) => void) | null>(null)

  const updateStep = useCallback(
    (stepId: string, status: WorkflowStepStatus, meta?: { txHash?: string; error?: string }) => {
      setInstance(prev => {
        if (!prev) return prev
        return {
          ...prev,
          updatedAt: Date.now(),
          steps: prev.steps.map(s =>
            s.stepId === stepId
              ? {
                  ...s,
                  status,
                  ...(status === 'running' && !s.startedAt ? { startedAt: Date.now() } : {}),
                  ...(status === 'success' || status === 'failed'
                    ? { completedAt: Date.now() }
                    : {}),
                  ...(meta?.txHash ? { txHash: meta.txHash } : {}),
                  ...(meta?.error ? { error: meta.error } : {}),
                }
              : s,
          ),
        }
      })
    },
    [],
  )

  const signStep = useCallback((stepId: string, txHash: string) => {
    if (signatureResolverRef.current) {
      signatureResolverRef.current(txHash)
      signatureResolverRef.current = null
    }
    setPendingSignatureStepId(null)
  }, [])

  const approve = useCallback(() => {
    if (!plan) return
    const initial = buildInitialInstance(plan)
    setInstance({ ...initial, status: 'running' })
    setIsApproved(true)
  }, [plan])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    setInstance(prev => (prev ? { ...prev, status: 'failed', updatedAt: Date.now() } : prev))
    setIsApproved(false)
  }, [])

  // Drive execution when approved
  useEffect(() => {
    if (!isApproved || !instance || !plan) return
    if (instance.status !== 'running') return

    const template = WORKFLOW_TEMPLATES.find(t => t.id === plan.templateId)
    if (!template) return

    const controller = new AbortController()
    abortControllerRef.current = controller

    let loopCount = 0
    const maxLoops =
      (plan.parameterValues['repeatCount'] as number | undefined) ?? 0

    const run = async () => {
      const readyIds = getReadySteps(template, instance)
      if (readyIds.length === 0) {
        // Check for loop step
        const loopStep = template.steps.find(s => s.type === 'loop')
        if (loopStep) {
          const shouldContinue = maxLoops === 0 || loopCount < maxLoops
          if (shouldContinue) {
            loopCount++
            // Reset loop-able steps back to pending
            setInstance(prev => {
              if (!prev) return prev
              const loopBackTo = loopStep.paramRefs['loopBackTo'] as string
              const loopBackIdx = template.steps.findIndex(s => s.id === loopBackTo)
              const resetIds = new Set(template.steps.slice(loopBackIdx).map(s => s.id))
              return {
                ...prev,
                updatedAt: Date.now(),
                steps: prev.steps.map(s =>
                  resetIds.has(s.stepId) ? { ...s, status: 'pending' } : s,
                ),
              }
            })
            return
          }
        }
        // No more ready steps and no loop — workflow complete
        setInstance(prev =>
          prev ? { ...prev, status: 'completed', updatedAt: Date.now() } : prev,
        )
        return
      }

      for (const stepId of readyIds) {
        const stepDef = template.steps.find(s => s.id === stepId)
        if (!stepDef) continue

        updateStep(stepId, 'running')

        try {
          await executeWorkflowStep(
            stepDef,
            instance,
            prevOutputsRef.current,
            {
              onStatusChange: updateStep,
              onSignatureRequired: async (_stepId, _tx) => {
                setPendingSignatureStepId(_stepId)
                return new Promise<string>(resolve => {
                  signatureResolverRef.current = resolve
                })
              },
              getPriceUsd: (assetId: AssetId) => {
                const state = store.getState()
                return selectMarketDataByAssetIdUserCurrency(state, assetId)?.price
              },
            },
            controller.signal,
          )
          updateStep(stepId, 'success')
        } catch (err) {
          updateStep(stepId, 'failed', { error: String(err) })
          setInstance(prev => (prev ? { ...prev, status: 'failed', updatedAt: Date.now() } : prev))
          return
        }
      }
    }

    void run()

    return () => {
      controller.abort()
    }
    // Re-run whenever instance.steps change (step completions trigger next step evaluation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproved, instance?.steps, plan, updateStep])

  return {
    instance,
    isApproved,
    approve,
    abort,
    pendingSignatureStepId,
    signStep,
  }
}
