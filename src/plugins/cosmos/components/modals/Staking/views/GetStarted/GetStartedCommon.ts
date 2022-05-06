import { AssetId } from '@shapeshiftoss/caip'
import { History } from 'history'

export type GetStartedManagerProps = {
  assetId: AssetId
}

export type GetStartedRouterProps = {
  assetId: AssetId
  stakingRouterHistory: History
  onClose: () => void
}

export enum GetStartedManagerRoutes {
  GetStarted = '/cosmos/modal/get-started',
  LearnMore = '/cosmos/modal/learn-more',
}
