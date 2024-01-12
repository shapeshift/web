import { ethChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight, type SwapErrorRight, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { FeeAmount } from '@uniswap/v3-sdk'
import assert from 'assert'
import type { GetContractReturnType, PublicClient, WalletClient } from 'viem'
import { type Address, getContract } from 'viem'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { viemClientByChainId } from 'lib/viem-client'

import { QuoterAbi } from '../getThorTradeQuote/abis/QuoterAbi'
import type { ThorTradeQuote } from '../getThorTradeQuote/getTradeQuote'
import { getL1quote } from './getL1quote'
import {
  feeAmountToContractMap,
  generateV3PoolAddressesAcrossFeeRange,
  getContractDataByPool,
  getQuotedAmountOutByPool,
  getTokenFromAsset,
  getWrappedToken,
  selectBestRate,
  TradeType,
} from './longTailHelpers'

// This just gets uses UniswapV3 to get the longtail quote for now.
export const getLongtailToL1Quote = async (
  input: GetTradeQuoteInput,
  streamingInterval: number,
  assetsById: AssetsByIdPartial,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  /*
    We only support ETH -> L1 for now.
    We can later add BSC via UniV3, or Avalanche (e.g. via PancakeSwap)
  */
  if (input.sellAsset.chainId !== ethChainId) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - Unsupported chainId ${input.sellAsset.chainId}.`,
        code: TradeQuoteError.UnknownError,
        details: { sellAssetChainId: input.sellAsset.chainId },
      }),
    )
  }

  const chainAdapterManager = getChainAdapterManager()
  const sellChainId = input.sellAsset.chainId
  const nativeBuyAssetId = chainAdapterManager.get(sellChainId)?.getFeeAssetId()
  const nativeBuyAsset = nativeBuyAssetId ? assetsById[nativeBuyAssetId] : undefined
  if (!nativeBuyAsset) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No native buy asset found for ${sellChainId}.`,
        code: TradeQuoteError.UnknownError,
        details: { sellAssetChainId: sellChainId },
      }),
    )
  }

  // TODO: use more than just UniswapV3, and also consider trianglar routes.
  const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984' // FIXME: this is only true for Ethereum
  const ALLOWANCE_CONTRACT = '0xF892Fef9dA200d9E84c9b0647ecFF0F34633aBe8' // TSAggregatorTokenTransferProxy

  const tokenA = getTokenFromAsset(input.sellAsset)
  const tokenB = getWrappedToken(nativeBuyAsset)

  const publicClient = viemClientByChainId[sellChainId as EvmChainId]
  assert(publicClient !== undefined, `no public client found for chainId '${sellChainId}'`)

  const poolAddresses: Map<
    Address,
    { token0Address: Address; token1Address: Address; fee: FeeAmount }
  > = generateV3PoolAddressesAcrossFeeRange(POOL_FACTORY_CONTRACT_ADDRESS, tokenA, tokenB)

  const poolContractData = getContractDataByPool(
    poolAddresses,
    publicClient,
    tokenA.address,
    tokenB.address,
  )

  const QUOTER_CONTRACT_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' // FIXME: this is only true for Ethereum
  const quoterContract: GetContractReturnType<typeof QuoterAbi, PublicClient, WalletClient> =
    getContract({
      abi: QuoterAbi,
      address: QUOTER_CONTRACT_ADDRESS,
      publicClient,
    })

  const quotedAmountOutByPool = await getQuotedAmountOutByPool(
    poolContractData,
    BigInt(input.sellAmountIncludingProtocolFeesCryptoBaseUnit),
    quoterContract,
  )

  const [bestPool, quotedAmountOut] = selectBestRate(quotedAmountOutByPool) ?? [
    undefined,
    undefined,
  ]

  const bestContractData = bestPool ? poolContractData.get(bestPool) : undefined
  const bestAggregator = bestContractData ? feeAmountToContractMap[bestContractData.fee] : undefined

  if (!bestAggregator || !quotedAmountOut) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No best aggregator contract found.`,
        code: TradeQuoteError.NoQuotesAvailableForTradePair,
      }),
    )
  }

  const l1Tol1QuoteInput: GetTradeQuoteInput = {
    ...input,
    sellAsset: nativeBuyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: quotedAmountOut.toString(),
  }

  const thorchainQuotes = await getL1quote(
    l1Tol1QuoteInput,
    streamingInterval,
    TradeType.LongTailToL1,
  )

  return thorchainQuotes.andThen(quotes => {
    const updatedQuotes: ThorTradeQuote[] = quotes.map(q => ({
      ...q,
      router: bestAggregator,
      steps: q.steps.map(s => ({
        ...s,
        // This logic will need to be updated to support multi-hop, if that's ever implemented for THORChain
        sellAmountIncludingProtocolFeesCryptoBaseUnit:
          input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
        sellAsset: input.sellAsset,
        allowanceContract: ALLOWANCE_CONTRACT,
      })),
      isLongtail: true,
    }))

    return Ok(updatedQuotes)
  })
}
