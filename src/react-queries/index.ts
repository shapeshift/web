import { mergeQueryKeys } from '@lukemorales/query-key-factory'
import { thorchainLp } from 'pages/ThorChainLP/queries/queries'

import { common } from './queries/common'
import { midgard } from './queries/midgard'
import { mutations } from './queries/mutations'
import { opportunities } from './queries/opportunities'
import { thornode } from './queries/thornode'

export const reactQueries = mergeQueryKeys(
  common,
  midgard,
  mutations,
  opportunities,
  thorchainLp,
  thornode,
)
