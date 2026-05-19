import type { WorkflowTemplate } from '../types'

export const takeProfitTriggerTemplate: WorkflowTemplate = {
  id: 'take-profit-trigger',
  name: 'Take-Profit Trigger',
  description: 'Watch an asset price and automatically sell when it reaches your target.',
  tags: ['take-profit', 'trigger', 'swap'],
  parameters: [
    { id: 'sellAssetId', label: 'Asset to sell', type: 'asset' },
    { id: 'sellAmount', label: 'Amount to sell', type: 'amount' },
    { id: 'targetPriceUsd', label: 'Target price (USD)', type: 'amount' },
    { id: 'buyAssetId', label: 'Asset to receive', type: 'asset' },
  ],
  steps: [
    {
      id: 'step-watch',
      type: 'condition',
      conditionKind: 'priceAbove',
      label: 'Wait for target price',
      paramRefs: {
        assetId: '$sellAssetId',
        targetPriceUsd: '$targetPriceUsd',
      },
    },
    {
      id: 'step-sell',
      type: 'swap',
      label: 'Sell at target',
      dependsOn: ['step-watch'],
      paramRefs: {
        sellAssetId: '$sellAssetId',
        sellAmount: '$sellAmount',
        buyAssetId: '$buyAssetId',
      },
    },
  ],
}
