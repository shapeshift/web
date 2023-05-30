import { KnownChainIds } from '@shapeshiftoss/types'
import type { CowChainId } from '../types'

export const isCowswapSupportedChainId = (
  chainId: string | undefined,
  supportedChains: KnownChainIds[],
): chainId is CowChainId => {
  return (
    (chainId === KnownChainIds.EthereumMainnet || chainId === KnownChainIds.GnosisMainnet) &&
    supportedChains.includes(chainId as CowChainId)
  )
}
