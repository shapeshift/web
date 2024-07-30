import type { ChainId } from '@shapeshiftoss/caip'

import type { PortalsSupportedChainId } from '../types'
import { PortalsSupportedChainIds } from '../types'

export const isSupportedChainId = (chainId: ChainId): chainId is PortalsSupportedChainId => {
  return PortalsSupportedChainIds.includes(chainId as PortalsSupportedChainId)
}
