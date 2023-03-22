import type * as z from 'zod'

import type { zerionChainsSchema } from './validators/chain'
import type { zerionPositionsSchema } from './validators/positions'

export type ZerionChains = z.TypeOf<typeof zerionChainsSchema>
export type ZerionPositions = z.TypeOf<typeof zerionPositionsSchema>
