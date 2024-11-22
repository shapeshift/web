import type { SvmChainId } from '@shapeshiftoss/types'

import { svmChainIds } from '../solana/SolanaChainAdapter'

export const isSvmChainId = (
  maybeSvmChainId: string | SvmChainId,
): maybeSvmChainId is SvmChainId => {
  return svmChainIds.includes(maybeSvmChainId as SvmChainId)
}
