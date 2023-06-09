import type { LifiStep, Step } from '@lifi/types'
import type { DeepPick } from 'lib/types'

export type LifiStepSubset = Pick<LifiStep, 'type'> & { includedSteps: OtherStepSubset[] }
export type OtherStepSubset = DeepPick<Step, 'type' | 'estimate.toAmountMin' | 'action.toToken'>
export type StepSubset = LifiStepSubset | OtherStepSubset
