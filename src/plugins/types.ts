import type { ChainId } from '@shapeshiftmonorepo/caip'
import type { ChainAdapter } from '@shapeshiftmonorepo/chain-adapters'
import type { KnownChainIds } from '@shapeshiftmonorepo/types'

import type { Route } from '@/Routes/helpers'
import type { FeatureFlags } from '@/state/slices/preferencesSlice/preferencesSlice'

export type Plugins = [chainId: string, chain: Plugin][]

export interface Plugin {
  name: string
  icon?: JSX.Element
  featureFlag?: (keyof FeatureFlags)[]
  onLoad?: () => void
  providers?: {
    chainAdapters?: [ChainId, () => ChainAdapter<KnownChainIds>][]
  }
  routes?: Route[]
}
