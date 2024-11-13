import type { SolanaChainId } from '@shapeshiftoss/types'

import { solanaChainIds } from '../solana/SolanaChainAdapter'

export const isSolanaChainId = (
  maybeSolanaChainId: string | SolanaChainId,
): maybeSolanaChainId is SolanaChainId => {
  return solanaChainIds.includes(maybeSolanaChainId as SolanaChainId)
}
