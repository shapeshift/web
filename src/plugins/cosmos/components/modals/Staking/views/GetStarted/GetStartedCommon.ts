import type { AssetId } from '@keepkey/caip'
import type { History } from 'history'

export type GetStartedManagerProps = {
  assetId: AssetId
}

export type GetStartedRouterProps = {
  assetId: AssetId
  stakingRouterHistory: History
}

export enum GetStartedManagerRoutes {
  GetStarted = '/cosmos/modal/get-started',
  LearnMore = '/cosmos/modal/learn-more',
}
