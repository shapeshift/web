import type { AssetId } from '@shapeshiftoss/caip'

import { enterYield, fetchAction } from '@/lib/yieldxyz/api'
import { YIELD_MAX_POLL_ATTEMPTS, YIELD_POLL_INTERVAL_MS } from '@/lib/yieldxyz/constants'
import { ActionStatus, TransactionStatus } from '@/lib/yieldxyz/types'

import { pollUntil } from './poller'
import type { WorkflowInstance, WorkflowStepDef, WorkflowStepStatus } from './types'

export type StepCallbacks = {
  onStatusChange: (
    stepId: string,
    status: WorkflowStepStatus,
    meta?: { txHash?: string; error?: string },
  ) => void
  onSignatureRequired: (stepId: string, tx: unknown) => Promise<string>
  getPriceUsd: (assetId: AssetId) => number | undefined
}

function resolveParam(
  value: string | unknown,
  instance: WorkflowInstance,
  prevOutputs: Record<string, unknown>,
): unknown {
  if (typeof value !== 'string') return value

  // Format: '<stepId.field>' — resolved from a prior step's output
  const crossStepMatch = value.match(/^<([\w-]+)\.([\w.]+)>$/)
  if (crossStepMatch) {
    const [, stepId, field] = crossStepMatch
    const output = prevOutputs[stepId] as Record<string, unknown> | undefined
    return field.split('.').reduce<unknown>((obj, key) => {
      if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key]
      return undefined
    }, output)
  }

  // Format: '$paramId' — resolved from instance parameter values
  if (value.startsWith('$')) {
    return instance.parameterValues[value.slice(1)]
  }

  return value
}

async function executeYieldEnter(
  step: WorkflowStepDef,
  instance: WorkflowInstance,
  prevOutputs: Record<string, unknown>,
  callbacks: StepCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const yieldId = resolveParam(step.paramRefs['yieldId'], instance, prevOutputs) as string
  const address = resolveParam(step.paramRefs['address'], instance, prevOutputs) as string
  const amount = resolveParam(step.paramRefs['amount'], instance, prevOutputs) as string

  const action = await enterYield({
    yieldId,
    address,
    arguments: { amount },
  })

  // Drive each transaction in the action to completion
  for (const tx of action.transactions ?? []) {
    if (tx.status === TransactionStatus.WaitingForSignature) {
      callbacks.onStatusChange(step.id, 'running', {})
      const txHash = await callbacks.onSignatureRequired(step.id, tx.unsignedTransaction)
      callbacks.onStatusChange(step.id, 'running', { txHash })
    }
  }

  // Poll action to completion
  await pollUntil(
    async () => {
      const latest = await fetchAction(action.id)
      if (latest.status === ActionStatus.Success) return true
      if (latest.status === ActionStatus.Failed || latest.status === ActionStatus.Canceled) {
        throw new Error(`Yield action ${latest.status.toLowerCase()}`)
      }
      return false
    },
    YIELD_POLL_INTERVAL_MS,
    YIELD_MAX_POLL_ATTEMPTS,
    signal,
  )
}

async function executeCondition(
  step: WorkflowStepDef,
  instance: WorkflowInstance,
  prevOutputs: Record<string, unknown>,
  callbacks: StepCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const kind = step.conditionKind

  if (kind === 'intervalMs') {
    const intervalMs = resolveParam(step.paramRefs['intervalMs'], instance, prevOutputs) as number
    await pollUntil(async () => true, intervalMs, 1, signal)
    return
  }

  if (kind === 'priceAbove' || kind === 'priceBelow') {
    const assetId = resolveParam(step.paramRefs['assetId'], instance, prevOutputs) as AssetId
    const target = resolveParam(step.paramRefs['targetPriceUsd'], instance, prevOutputs) as number

    await pollUntil(
      async () => {
        const price = callbacks.getPriceUsd(assetId)
        if (price === undefined) return false
        return kind === 'priceAbove' ? price >= target : price <= target
      },
      YIELD_POLL_INTERVAL_MS,
      YIELD_MAX_POLL_ATTEMPTS,
      signal,
    )
    return
  }

  throw new Error(`Unknown condition kind: ${kind}`)
}

export async function executeWorkflowStep(
  step: WorkflowStepDef,
  instance: WorkflowInstance,
  prevOutputs: Record<string, unknown>,
  callbacks: StepCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  switch (step.type) {
    case 'yieldEnter':
      return executeYieldEnter(step, instance, prevOutputs, callbacks, signal)

    case 'condition':
      return executeCondition(step, instance, prevOutputs, callbacks, signal)

    case 'swap':
    case 'perpOpen':
      // Swap and perp execution is driven by the UI layer (wallet signing hooks).
      // The executor marks the step running; the hook calls onSignatureRequired.
      callbacks.onStatusChange(step.id, 'running', {})
      await callbacks.onSignatureRequired(step.id, step.paramRefs)
      return

    case 'loop':
      // Loop is managed by the calling useWorkflowExecution hook, not here.
      return

    default:
      throw new Error(`Unsupported step type: ${(step as WorkflowStepDef).type}`)
  }
}

/**
 * Returns the ordered list of step IDs ready to execute given the current instance state.
 * A step is ready when all its dependsOn steps are 'success'.
 */
export function getReadySteps(template: { steps: WorkflowStepDef[] }, instance: WorkflowInstance): string[] {
  const statusById = Object.fromEntries(instance.steps.map(s => [s.stepId, s.status]))

  return template.steps
    .filter(def => {
      const current = statusById[def.id]
      if (current && current !== 'pending') return false
      if (!def.dependsOn || def.dependsOn.length === 0) return true
      return def.dependsOn.every(depId => statusById[depId] === 'success')
    })
    .map(def => def.id)
}
