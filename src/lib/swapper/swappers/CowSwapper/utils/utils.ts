import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads/build'
import { Err, Ok } from '@sniptt/monads/build'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'

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

export const getSigningDomainFromChainId = (chainId: ChainId): Result<number, SwapErrorRight> => {
  try {
    return Ok(Number(chainId.split(':')[1]))
  } catch (e) {
    return Err(
      makeSwapErrorRight({
        message: `Invalid chainId: $chainId`,
        code: SwapErrorType.VALIDATION_FAILED,
      }),
    )
  }
}
