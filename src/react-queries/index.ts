import { mergeQueryKeys } from '@lukemorales/query-key-factory'
import { thorchainLp } from 'pages/ThorChainLP/queries/queries'

import { accountManagement } from './queries/accountManagement'
import { common } from './queries/common'
import { midgard } from './queries/midgard'
import { mutations } from './queries/mutations'
import { opportunities } from './queries/opportunities'
import { swapper } from './queries/swapper'
import { thornode } from './queries/thornode'

export const reactQueries = mergeQueryKeys(
  accountManagement,
  common,
  midgard,
  mutations,
  opportunities,
  thorchainLp,
  thornode,
  swapper,
)
