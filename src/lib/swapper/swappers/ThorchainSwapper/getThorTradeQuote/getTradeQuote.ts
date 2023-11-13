import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { Token } from '@uniswap/sdk-core'
import { computePoolAddress, FeeAmount } from '@uniswap/v3-sdk'
import { getConfig } from 'config'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn } from 'lib/bignumber/bignumber'
import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/types'
import { SwapErrorType } from 'lib/swapper/types'
import { makeSwapErrorRight } from 'lib/swapper/utils'
import { assertUnreachable } from 'lib/utils'
import type { AssetsById } from 'state/slices/assetsSlice/assetsSlice'

import { zrxApi } from '../../ZrxSwapper/endpoints'
import type { ThornodePoolResponse } from '../types'
import { getL1quote } from '../utils/getL1quote'
import { assetIdToPoolAssetId } from '../utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from '../utils/thorService'

export type ThorEvmTradeQuote = TradeQuote &
  ThorTradeQuoteSpecificMetadata & {
    router: string
    data: string
  }

enum TradeType {
  LongTailToLongTail,
  LongTailToL1,
  L1ToLongTail,
  L1ToL1,
}

type ThorTradeQuoteSpecificMetadata = { isStreaming: boolean; memo: string }
type ThorTradeQuoteBase = TradeQuote | ThorEvmTradeQuote
export type ThorTradeQuote = ThorTradeQuoteBase & ThorTradeQuoteSpecificMetadata

export const getThorTradeQuote = async (
  input: GetTradeQuoteInput,
  assetsById: AssetsById,
): Promise<Result<ThorTradeQuote[], SwapErrorRight>> => {
  const { sellAsset, buyAsset, chainId, receiveAddress } = input

  console.log('xxx getThorTradeQuote')

  const { chainId: buyAssetChainId } = fromAssetId(buyAsset.assetId)

  const chainAdapterManager = getChainAdapterManager()
  const sellAdapter = chainAdapterManager.get(chainId)
  const buyAdapter = chainAdapterManager.get(buyAssetChainId)

  if (!sellAdapter || !buyAdapter) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No chain adapter found for ${chainId} or ${buyAssetChainId}.`,
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { sellAssetChainId: chainId, buyAssetChainId },
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[getThorTradeQuote]: receiveAddress is required',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )
  }

  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const maybePoolsResponse = await thorService.get<ThornodePoolResponse[]>(
    `${daemonUrl}/lcd/thorchain/pools`,
  )

  if (maybePoolsResponse.isErr()) return Err(maybePoolsResponse.unwrapErr())

  const { data: poolsResponse } = maybePoolsResponse.unwrap()

  const buyPoolId = assetIdToPoolAssetId({ assetId: buyAsset.assetId })
  const sellPoolId = assetIdToPoolAssetId({ assetId: sellAsset.assetId })

  // If one or both of these are undefined it means we are tradeing one or more long-tail ERC20 tokens
  const sellAssetPool = poolsResponse.find(pool => pool.asset === sellPoolId)
  const buyAssetPool = poolsResponse.find(pool => pool.asset === buyPoolId)

  const tradeType = (() => {
    switch (true) {
      case !sellAssetPool && !buyAssetPool:
        return TradeType.LongTailToLongTail
      case !sellAssetPool && !!buyAssetPool:
        return TradeType.LongTailToL1
      case !!sellAssetPool && !buyAssetPool:
        return TradeType.L1ToLongTail
      case !!sellAssetPool && !!buyAssetPool:
      case !!buyAssetPool && !sellAssetPool && sellPoolId === 'THOR.RUNE':
      case !!sellAssetPool && !buyAssetPool && buyPoolId !== 'THOR.RUNE':
        return TradeType.L1ToL1
      default:
        return undefined
    }
  })()

  if (tradeType === undefined) return Err(makeSwapErrorRight({ message: 'Unknown trade type' }))

  console.log('xxx tradeType', tradeType)

  const streamingInterval =
    sellAssetPool && buyAssetPool
      ? (() => {
          const sellAssetDepthBps = sellAssetPool.derived_depth_bps
          const buyAssetDepthBps = buyAssetPool.derived_depth_bps
          const swapDepthBps = bn(sellAssetDepthBps).plus(buyAssetDepthBps).div(2)
          // Low health for the pools of this swap - use a longer streaming interval
          if (swapDepthBps.lt(5000)) return 10
          // Moderate health for the pools of this swap - use a moderate streaming interval
          if (swapDepthBps.lt(9000) && swapDepthBps.gte(5000)) return 5
          // Pool is at 90%+ health - use a 1 block streaming interval
          return 1
        })()
      : // TODO: One of the pools is RUNE - use the as-is 10 until we work out how best to handle this
        10

  const zrxSwapper = zrxApi
  switch (tradeType) {
    case TradeType.L1ToL1:
      return getL1quote(input, streamingInterval)
    case TradeType.LongTailToL1:
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

      // FIXME: need to swap out the takerAddress to the THORChain pool(?) address
      const longTailToL1QuoteInput: GetTradeQuoteInput = { ...input, buyAsset: nativeBuyAsset }
      const zrxQuoteResponse = await zrxSwapper.getTradeQuote(longTailToL1QuoteInput, assetsById)
      console.log(
        'xxx zrxQoute',
        zrxQuoteResponse.isOk() ? zrxQuoteResponse.unwrap() : zrxQuoteResponse.unwrapErr(),
      )
      if (zrxQuoteResponse.isErr()) return Err(zrxQuoteResponse.unwrapErr())
      const zrxQuote = zrxQuoteResponse.unwrap()
      const buyAmountAfterFeesCryptoBaseUnit = zrxQuote[0].steps[0].buyAmountAfterFeesCryptoBaseUnit
      const l1Tol1QuoteInput: GetTradeQuoteInput = {
        ...input,
        sellAmountIncludingProtocolFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      }

      // Try getting direct UniswapV3 quote here
      const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
      // const QUOTER_CONTRACT_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'

      // Map tokens to Uniswap SDK Token objects
      const tokenA: Token = new Token(
        Number(fromAssetId(input.sellAsset.assetId).chainReference),
        fromAssetId(input.sellAsset.assetId).assetReference,
        input.sellAsset.precision,
        input.sellAsset.symbol,
        input.sellAsset.name,
      )

      // const tokenB: Token = new Token(
      //   Number(fromAssetId(input.buyAsset.assetId).chainReference),
      //   fromAssetId(input.buyAsset.assetId).assetReference,
      //   input.buyAsset.precision,
      //   input.buyAsset.symbol,
      //   input.buyAsset.name,
      // )

      const WETH_TOKEN = new Token(
        1, // FIXME
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        18,
        'WETH',
        'Wrapped Ether',
      )

      const currentPoolAddress = computePoolAddress({
        factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
        tokenA,
        tokenB: WETH_TOKEN,
        fee: FeeAmount.MEDIUM, // FIXME: map to actual pool used
      })

      console.log('xxx currentPoolAddress', currentPoolAddress)

      const thorchainQuote = await getL1quote(l1Tol1QuoteInput, streamingInterval)
      // FIXME: work out how (and where) to build the aggreageted unsigned tx hitting the swapIn method of the appropriate contract
      // FIXME: work out how to pass it back up, if it's done in here?
      return thorchainQuote
    case TradeType.LongTailToLongTail:
      return Err(makeSwapErrorRight({ message: 'Not implemented yet' }))
    case TradeType.L1ToLongTail:
      return Err(makeSwapErrorRight({ message: 'Not implemented yet' }))
    default:
      assertUnreachable(tradeType)
  }

  /*
    Additional logic to handle long tail tokens (long-tail to L1 in this pass).

    1. Get quote against a hardcoded DEX (UniV3): https://docs.uniswap.org/sdk/v3/guides/swaps/quoting from long-tail to L1 base asset
    for the sell asset chain (e.g. SHIT on Ethereum to ETH).
    2. Get Thorswap quote from L1 base asset to target L1 (e.g. ETH to BTC)
    3. Compute aggregate rate
  */
}
