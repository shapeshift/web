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
  GetStarted = '/defi/modal/get-started',
  LearnMore = '/defi/modal/learn-more',
}
