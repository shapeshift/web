import type { QuoteResponse, SwapInstructionsResponse } from '@jup-ag/api'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'

import type { SwapErrorRight } from '../../../types'
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
  slippageBps: string | undefined
}

type GetJupiterSwapArgs = {
  apiUrl: string
  fromAddress: string
  rawQuote: unknown
  toAddress?: string
  useSharedAccounts: boolean
}

export const getJupiterPrice = ({
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
      (slippageBps ? `&slippageBps=${slippageBps}` : `&autoSlippage=true`) +
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
  })
