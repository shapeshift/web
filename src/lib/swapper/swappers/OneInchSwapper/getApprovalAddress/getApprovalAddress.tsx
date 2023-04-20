import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import type { AxiosResponse } from 'axios'
import axios from 'axios'

import type { OneInchSpenderResponse, OneInchSwapperDeps } from '../utils/types'

export async function getApprovalAddress(
  deps: OneInchSwapperDeps,
  chainId: EvmChainId,
): Promise<string> {
  const { chainReference } = fromChainId(chainId)
  try {
    const spenderResponse: AxiosResponse<OneInchSpenderResponse> = await axios.get(
      `${deps.apiUrl}/${chainReference}/approve/spender`,
    )
    return spenderResponse.data.address
  } catch (e) {
    throw new SwapError('[getApprovalAddress]', { cause: e, code: SwapErrorType.RESPONSE_ERROR })
  }
}
