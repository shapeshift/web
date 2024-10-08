import type { LiFiStep, Step } from '@lifi/types'
import type { DeepPick } from '@shapeshiftoss/types'

export type LifiStepSubset = Pick<LiFiStep, 'type'> & { includedSteps: OtherStepSubset[] }
export type OtherStepSubset = DeepPick<Step, 'type' | 'estimate.toAmountMin' | 'action.toToken'>
export type StepSubset = LifiStepSubset | OtherStepSubset
