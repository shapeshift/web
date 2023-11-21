import type { MarketData } from '@shapeshiftoss/types'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'
import type { Asset } from 'lib/asset-service'

export type EstimatedFeesQueryKey = [
  'estimateFees',
  {
    enabled: boolean
    asset: Asset | undefined
    assetMarketData: MarketData
    estimateFeesInput: EstimateFeesInput | undefined
  },
]
