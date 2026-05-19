import type { WorkflowTemplate } from '../types'

import { dcaTemplate } from './dca'
import { swapOpenPerpTemplate } from './swapOpenPerp'
import { swapStakeTemplate } from './swapStake'
import { takeProfitTriggerTemplate } from './takeProfitTrigger'

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  swapStakeTemplate,
  dcaTemplate,
  takeProfitTriggerTemplate,
  swapOpenPerpTemplate,
]

export { dcaTemplate, swapOpenPerpTemplate, swapStakeTemplate, takeProfitTriggerTemplate }
