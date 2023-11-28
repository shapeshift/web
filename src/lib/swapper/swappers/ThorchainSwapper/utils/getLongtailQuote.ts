import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { computePoolAddress, FeeAmount } from '@uniswap/v3-sdk'
import assert from 'assert'
import type { Address } from 'viem'
import { getContract } from 'viem'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { type GetTradeQuoteInput, type SwapErrorRight, SwapErrorType } from 'lib/swapper/types'
import { makeSwapErrorRight } from 'lib/swapper/utils'
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
  // todo: early exit if Avalanche - UniV3 is only on Ethereum & BSC
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

  const tokenA = getTokenFromAsset(input.sellAsset)
  const tokenB = getWrappedToken(nativeBuyAsset)

  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
    tokenA,
    tokenB,
    fee: FeeAmount.MEDIUM, // FIXME: map to actual pool used
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
      tokenIn, // one of these is the sell asset
      tokenOut, // the other is the network fee asset. Work out which is which.
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

  return thorchainQuotes
    .mapErr(e => {
      console.error('Thorchain quote error:', e)
      return makeSwapErrorRight({
        message: 'makeSwapperAxiosServiceMonadic',
        cause: e,
        code: SwapErrorType.QUERY_FAILED,
      })
    })
    .andThen(quotes => {
      const updatedQuotes: ThorTradeQuote[] = quotes.map(q => ({
        ...q,
        steps: q.steps.map(s => ({
          ...s,
          // This logic will need to be updated to support multi-hop, if that's ever implemented for THORChain
          sellAmountIncludingProtocolFeesCryptoBaseUnit:
            input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
        })),
      }))

      return Ok(updatedQuotes)
    })
}
