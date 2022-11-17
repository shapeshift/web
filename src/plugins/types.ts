import type { ChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { Route } from 'Routes/helpers'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

export type Plugins = [chainId: string, chain: Plugin][]

export interface Plugin {
  name: string
  icon?: JSX.Element
  featureFlag?: (keyof FeatureFlags)[]
  onLoad?: () => void
  providers?: {
    chainAdapters?: [ChainId, () => ChainAdapter<ChainId>][]
  }
  routes?: Route[]
}
