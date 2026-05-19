import type { WorkflowTemplate } from '../types'

export const swapStakeTemplate: WorkflowTemplate = {
  id: 'swap-stake',
  name: 'Swap & Stake',
  description: 'Swap any asset into a stakeable token, then deposit it into a yield position.',
  tags: ['staking', 'yield', 'swap'],
  parameters: [
    { id: 'sellAssetId', label: 'Sell asset', type: 'asset' },
    { id: 'sellAmount', label: 'Amount to sell', type: 'amount' },
    { id: 'buyAssetId', label: 'Asset to stake', type: 'asset' },
    { id: 'yieldId', label: 'Yield position', type: 'asset' },
    { id: 'userAddress', label: 'Your address', type: 'asset' },
  ],
  steps: [
    {
      id: 'step-swap',
      type: 'swap',
      label: 'Swap to stakeable asset',
      paramRefs: {
        sellAssetId: '$sellAssetId',
        sellAmount: '$sellAmount',
        buyAssetId: '$buyAssetId',
      },
    },
    {
      id: 'step-stake',
      type: 'yieldEnter',
      label: 'Deposit into yield position',
      dependsOn: ['step-swap'],
      paramRefs: {
        yieldId: '$yieldId',
        address: '$userAddress',
        amount: '<step-swap.outputAmount>',
      },
    },
  ],
}
