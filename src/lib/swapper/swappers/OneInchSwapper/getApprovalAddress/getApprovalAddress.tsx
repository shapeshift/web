import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'
import type { SwapErrorRight } from 'lib/swapper/api'

import { oneInchService } from '../utils/oneInchService'
import type { OneInchSpenderResponse, OneInchSwapperDeps } from '../utils/types'

export async function getApprovalAddress(
  deps: OneInchSwapperDeps,
  chainId: EvmChainId,
): Promise<Result<string, SwapErrorRight>> {
  const { chainReference } = fromChainId(chainId)
  const maybeSpenderResponse = await oneInchService.get<OneInchSpenderResponse>(
    `${deps.apiUrl}/${chainReference}/approve/spender`,
  )
  return maybeSpenderResponse.andThen(spenderResponse => Ok(spenderResponse.data.address))
}
