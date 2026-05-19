import type { WorkflowTemplate } from '../types'

// Execution is gated behind a feature flag until yield.xyz perpetuals API is live.
export const swapOpenPerpTemplate: WorkflowTemplate = {
  id: 'swap-open-perp',
  name: 'Swap & Open Perp',
  description: 'Swap to USDC collateral, then open a leveraged perpetual position.',
  tags: ['perps', 'leverage', 'swap'],
  parameters: [
    { id: 'sellAssetId', label: 'Asset to sell', type: 'asset' },
    { id: 'collateralAmount', label: 'Collateral amount (USDC)', type: 'amount' },
    { id: 'market', label: 'Perp market (e.g. ETH-USD)', type: 'asset' },
    { id: 'side', label: 'Long or short', type: 'asset' },
    { id: 'leverage', label: 'Leverage (e.g. 2)', type: 'number', default: 2 },
    { id: 'userAddress', label: 'Your address', type: 'asset' },
  ],
  steps: [
    {
      id: 'step-swap',
      type: 'swap',
      label: 'Swap to USDC collateral',
      paramRefs: {
        sellAssetId: '$sellAssetId',
        sellAmount: '$collateralAmount',
        buyAssetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC mainnet
      },
    },
    {
      id: 'step-open-perp',
      type: 'perpOpen',
      label: 'Open leveraged position',
      dependsOn: ['step-swap'],
      paramRefs: {
        market: '$market',
        side: '$side',
        leverage: '$leverage',
        address: '$userAddress',
        collateral: '<step-swap.outputAmount>',
      },
    },
  ],
}
