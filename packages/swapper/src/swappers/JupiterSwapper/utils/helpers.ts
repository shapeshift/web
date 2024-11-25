import { type ChainId, fromAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight } from '../../../types'
import type { QuoteResponse } from '../models/QuoteResponse'
import type { SwapInstructionsResponse } from '../models/SwapInstructionsResponse'
import { jupiterSupportedChainIds } from './constants'
import { jupiterService } from './jupiterService'

export const isSupportedChainId = (chainId: ChainId): chainId is KnownChainIds.SolanaMainnet => {
  return jupiterSupportedChainIds.includes(chainId)
}

const JUPITER_TRANSACTION_MAX_ACCOUNTS = 54

type GetJupiterQuoteArgs = {
  apiUrl: string
  sourceAsset: string
  destinationAsset: string
  commissionBps: string
  amount: string
  slippageBps: string
}

type GetJupiterSwapArgs = {
  apiUrl: string
  fromAddress: string
  rawQuote: unknown
  toAddress?: string
  useSharedAccounts: boolean
  wrapAndUnwrapSol: boolean
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
      `&maxAccounts=${JUPITER_TRANSACTION_MAX_ACCOUNTS}` +
      `&platformFeeBps=${commissionBps}`,
  )

// @TODO: Add DAO's fee account
export const getJupiterSwapInstructions = ({
  apiUrl,
  fromAddress,
  toAddress,
  rawQuote,
  useSharedAccounts,
  wrapAndUnwrapSol,
}: GetJupiterSwapArgs): Promise<
  Result<AxiosResponse<SwapInstructionsResponse, any>, SwapErrorRight>
> =>
  jupiterService.post<SwapInstructionsResponse>(`${apiUrl}/swap-instructions`, {
    userPublicKey: fromAddress,
    destinationTokenAccount: toAddress,
    useSharedAccounts,
    quoteResponse: rawQuote,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: 'auto',
    wrapAndUnwrapSol,
  })
