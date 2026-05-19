import type { WorkflowTemplate } from '../types'

export const dcaTemplate: WorkflowTemplate = {
  id: 'dca',
  name: 'DCA (Recurring Buy)',
  description: 'Buy a fixed USD amount of an asset on a repeating schedule.',
  tags: ['dca', 'recurring', 'swap'],
  parameters: [
    { id: 'buyAssetId', label: 'Asset to buy', type: 'asset' },
    { id: 'amountUsd', label: 'Amount per purchase (USD)', type: 'amount' },
    { id: 'intervalMs', label: 'Purchase interval', type: 'duration' },
    { id: 'repeatCount', label: 'Number of purchases (0 = infinite)', type: 'number', default: 0 },
  ],
  steps: [
    {
      id: 'step-wait',
      type: 'condition',
      conditionKind: 'intervalMs',
      label: 'Wait for next purchase window',
      paramRefs: {
        intervalMs: '$intervalMs',
      },
    },
    {
      id: 'step-swap',
      type: 'swap',
      label: 'Buy asset',
      dependsOn: ['step-wait'],
      paramRefs: {
        buyAssetId: '$buyAssetId',
        amountUsd: '$amountUsd',
      },
    },
    {
      id: 'step-loop',
      type: 'loop',
      label: 'Repeat',
      dependsOn: ['step-swap'],
      paramRefs: {
        repeatCount: '$repeatCount',
        loopBackTo: 'step-wait',
      },
    },
  ],
}
