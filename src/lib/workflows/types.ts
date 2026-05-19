export type WorkflowStepType =
  | 'swap'
  | 'yieldEnter'
  | 'perpOpen'
  | 'condition'
  | 'loop'

export type ConditionKind = 'priceAbove' | 'priceBelow' | 'intervalMs'

export type WorkflowParameterType = 'asset' | 'amount' | 'chain' | 'number' | 'duration'

export type WorkflowParameter = {
  id: string
  label: string
  type: WorkflowParameterType
  default?: unknown
}

export type WorkflowStepDef = {
  id: string
  type: WorkflowStepType
  label: string
  dependsOn?: string[]
  paramRefs: Record<string, string | unknown>
  conditionKind?: ConditionKind
}

export type WorkflowTemplate = {
  id: string
  name: string
  description: string
  tags: string[]
  parameters: WorkflowParameter[]
  steps: WorkflowStepDef[]
}

export type WorkflowStepStatus =
  | 'pending'
  | 'waiting'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'

export type WorkflowStepInstance = {
  stepId: string
  status: WorkflowStepStatus
  startedAt?: number
  completedAt?: number
  txHash?: string
  error?: string
}

export type WorkflowInstanceStatus =
  | 'pending_approval'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'

export type WorkflowInstance = {
  id: string
  templateId: string
  parameterValues: Record<string, unknown>
  steps: WorkflowStepInstance[]
  status: WorkflowInstanceStatus
  createdAt: number
  updatedAt: number
}
