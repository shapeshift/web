import type { ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight } from '../../../types'
import type { QuoteResponse } from '../models/QuoteResponse'
import type { JupiterSupportedChainId } from '../types'
import { jupiterSupportedChainIds } from './constants'
import { jupiterService } from './jupiterService'

export const isSupportedChainId = (chainId: ChainId): chainId is JupiterSupportedChainId => {
  return jupiterSupportedChainIds.includes(chainId as JupiterSupportedChainId)
}

type GetJupiterSwapArgs = {
  apiUrl: string
  sourceAsset: string
  destinationAsset: string
  commissionBps: string
  amount: string
  slippageBps?: string
}

export const getJupiterSwap = ({
  apiUrl,
  sourceAsset,
  destinationAsset,
  commissionBps,
  amount,
  slippageBps,
}: GetJupiterSwapArgs): Promise<Result<AxiosResponse<QuoteResponse, any>, SwapErrorRight>> =>
  jupiterService.get<QuoteResponse>(
    `${apiUrl}/v6/quote` +
      `?inputMint=${sourceAsset}` +
      `&outputMint=${destinationAsset}` +
      `&amount=${amount}` +
      `&slippageBps=${slippageBps}` +
      `&platformFeeBps=${commissionBps}`,
  )
