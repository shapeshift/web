import type { Asset, MarketData } from '@shapeshiftoss/types'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'

export type EstimatedFeesQueryKey = [
  'estimateFees',
  {
    enabled: boolean
    asset: Asset | undefined
    assetMarketData: MarketData
    estimateFeesInput: EstimateFeesInput | undefined
  },
]
