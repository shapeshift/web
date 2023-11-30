import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
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
import { getTokenFromAsset, getWrappedToken } from './longTailHelpers'

export const getLongtailToL1Quote = async ({
  input,
  streamingInterval,
  streamingQuantity,
  assetsById,
}: {
  input: GetTradeQuoteInput
  streamingInterval: number
  streamingQuantity: number
  assetsById: AssetsById
}): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
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
  const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
  const QUOTER_CONTRACT_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'

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

  const quotedAmountOut = await quoterContract.simulate
    .quoteExactInputSingle([
      token0,
      token1,
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

  const thorchainQuote = await getL1quote({
    input: l1Tol1QuoteInput,
    streamingInterval,
    streamingQuantity,
  })
  return thorchainQuote
}
