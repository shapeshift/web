import type * as z from 'zod'

import type { ZERION_CHAINS, ZERION_FEE_ASSETS } from './mapping'
import type { zerionChainsSchema } from './validators/chain'
import type { zerionFungiblesSchema } from './validators/fungible'
import type { zerionPositionsSchema } from './validators/positions'

export type ZerionChains = z.TypeOf<typeof zerionChainsSchema>
export type ZerionPositions = z.TypeOf<typeof zerionPositionsSchema>
export type ZerionFungiblesSchema = z.TypeOf<typeof zerionFungiblesSchema>

export type ZerionChainId = typeof ZERION_CHAINS[number]
export type ZerionFeeAssetId = typeof ZERION_FEE_ASSETS[number]
