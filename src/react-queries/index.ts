import { mergeQueryKeys } from '@lukemorales/query-key-factory'

import { accountManagement } from './queries/accountManagement'
import { common } from './queries/common'
import { midgard } from './queries/midgard'
import { mutations } from './queries/mutations'
import { opportunities } from './queries/opportunities'
import { swapper } from './queries/swapper'
import { mayanode, thornode } from './queries/thornode'

import { thorchainLp } from '@/pages/ThorChainLP/queries/queries'

export const reactQueries = mergeQueryKeys(
  accountManagement,
  common,
  midgard,
  mutations,
  opportunities,
  thorchainLp,
  swapper,
  thornode,
  mayanode,
)
