import { ethChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight, type SwapErrorRight, SwapErrorType } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { computePoolAddress, FeeAmount } from '@uniswap/v3-sdk'
import assert from 'assert'
import type { Address } from 'viem'
import { getContract } from 'viem'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { viemClientByChainId } from 'lib/viem-client'
import type { AssetsById } from 'state/slices/assetsSlice/assetsSlice'

import { IUniswapV3PoolABI } from '../getThorTradeQuote/abis/IUniswapV3PoolAbi'
import { QuoterAbi } from '../getThorTradeQuote/abis/QuoterAbi'
import type { ThorTradeQuote } from '../getThorTradeQuote/getTradeQuote'
import { getL1quote } from './getL1quote'
import { getTokenFromAsset, getWrappedToken, TradeType } from './longTailHelpers'

// This just gets uses UniswapV3 to get the longtail quote for now.
export const getLongtailToL1Quote = async (
  input: GetTradeQuoteInput,
  streamingInterval: number,
  assetsById: AssetsById,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  /*
    We only support ETH -> L1 for now.
    We can later add BSC via UniV3, or Avalanche (e.g. via PancakeSwap)
  */
  if (input.sellAsset.chainId !== ethChainId) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - Unsupported chainId ${input.sellAsset.chainId}.`,
        code: SwapErrorType.UNSUPPORTED_CHAIN,
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
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { sellAssetChainId: sellChainId },
      }),
    )
  }

  // TODO: use more than just UniswapV3, and also consider trianglar routes.
  const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984' // FIXME: this is only true for Ethereum
  const QUOTER_CONTRACT_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' // FIXME: this is only true for Ethereum
  // TODO: we need to fetch this dynamically, as it can change
  const AGGREGATOR_CONTRACT = '0x11733abf0cdb43298f7e949c930188451a9a9ef2' // TSAggregatorUniswapV3 3000 - this needs to match the fee below
  const ALLOWANCE_CONTRACT = '0xF892Fef9dA200d9E84c9b0647ecFF0F34633aBe8' // TSAggregatorTokenTransferProxy

  const tokenA = getTokenFromAsset(input.sellAsset)
  const tokenB = getWrappedToken(nativeBuyAsset)

  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
    tokenA,
    tokenB,
    fee: FeeAmount.MEDIUM, // FIXME: how best should be pick this?
  })

  const publicClient = viemClientByChainId[sellChainId as EvmChainId]
  assert(publicClient !== undefined, `no public client found for chainId '${sellChainId}'`)

  const poolContract = getContract({
    abi: IUniswapV3PoolABI,
    address: currentPoolAddress as Address,
    publicClient,
  })

  const [token0, token1, fee] = await Promise.all([
    poolContract.read.token0(),
    poolContract.read.token1(),
    poolContract.read.fee(),
  ])

  const quoterContract = getContract({
    abi: QuoterAbi,
    address: QUOTER_CONTRACT_ADDRESS as Address,
    publicClient,
  })

  const tokenIn = token0 === tokenA.address ? token0 : token1
  const tokenOut = token1 === tokenB.address ? token1 : token0

  const quotedAmountOut = await quoterContract.simulate
    .quoteExactInputSingle([
      tokenIn,
      tokenOut,
      fee,
      BigInt(input.sellAmountIncludingProtocolFeesCryptoBaseUnit),
      BigInt(0),
    ])
    .then(res => res.result)

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
      router: AGGREGATOR_CONTRACT,
      steps: q.steps.map(s => ({
        ...s,
        // This logic will need to be updated to support multi-hop, if that's ever implemented for THORChain
        sellAmountIncludingProtocolFeesCryptoBaseUnit:
          input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
        sellAsset: input.sellAsset,
        allowanceContract: ALLOWANCE_CONTRACT,
      })),
    }))

    return Ok(updatedQuotes)
  })
}
