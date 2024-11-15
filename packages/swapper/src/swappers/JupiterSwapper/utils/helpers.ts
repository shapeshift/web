import { type ChainId, fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight } from '../../../types'
import type { QuoteResponse } from '../models/QuoteResponse'
import type { SwapInstructionsResponse } from '../models/SwapInstructionsResponse'
import type { JupiterSupportedChainId } from '../types'
import { jupiterSupportedChainIds } from './constants'
import { jupiterService } from './jupiterService'

export const isSupportedChainId = (chainId: ChainId): chainId is JupiterSupportedChainId => {
  return jupiterSupportedChainIds.includes(chainId as JupiterSupportedChainId)
}

type GetJupiterQuoteArgs = {
  apiUrl: string
  sourceAsset: string
  destinationAsset: string
  commissionBps: string
  amount: string
  slippageBps?: string
}

type GetJupiterSwapArgs = {
  apiUrl: string
  fromAddress: string
  // @TODO: make this mandatory when we have the DAO fee account
  feeAccount?: string
  rawQuote: unknown
}

export const getJupiterQuote = ({
  apiUrl,
  sourceAsset,
  destinationAsset,
  commissionBps,
  amount,
  slippageBps,
}: GetJupiterQuoteArgs): Promise<Result<AxiosResponse<QuoteResponse, any>, SwapErrorRight>> =>
  jupiterService.get<QuoteResponse>(
    `${apiUrl}/quote` +
      `?inputMint=${fromAssetId(sourceAsset).assetReference}` +
      `&outputMint=${fromAssetId(destinationAsset).assetReference}` +
      `&amount=${amount}` +
      `&slippageBps=${slippageBps}` +
      `&platformFeeBps=${commissionBps}`,
  )

export const getJupiterSwapInstructions = ({
  apiUrl,
  fromAddress,
  feeAccount,
  rawQuote,
}: GetJupiterSwapArgs): Promise<
  Result<AxiosResponse<SwapInstructionsResponse, any>, SwapErrorRight>
> =>
  jupiterService.post<SwapInstructionsResponse>(`${apiUrl}/swap-instructions`, {
    userPublicKey: fromAddress,
    feeAccount,
    quoteResponse: rawQuote,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: 'auto',
  })
