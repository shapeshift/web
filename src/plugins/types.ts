import { ChainId } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { Route } from 'Routes/helpers'
import { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

export type Plugins = [chainId: string, chain: Plugin][]

export interface Plugin {
  name: string
  icon?: JSX.Element
  featureFlag?: keyof FeatureFlags
  onLoad?: () => void
  providers?: {
    chainAdapters?: Array<[ChainId, () => ChainAdapter<ChainId>]>
  }
  routes?: Route[]
}
