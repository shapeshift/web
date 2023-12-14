import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { SwapErrorRight } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'

import { oneInchService } from '../utils/oneInchService'
import type { OneInchSpenderResponse } from '../utils/types'

export async function getApprovalAddress(
  apiUrl: string,
  chainId: EvmChainId,
): Promise<Result<string, SwapErrorRight>> {
  const { chainReference } = fromChainId(chainId)
  const maybeSpenderResponse = await oneInchService.get<OneInchSpenderResponse>(
    `${apiUrl}/${chainReference}/approve/spender`,
  )
  return maybeSpenderResponse.andThen(spenderResponse => Ok(spenderResponse.data.address))
}
