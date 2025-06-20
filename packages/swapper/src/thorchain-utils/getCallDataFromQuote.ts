import { fromAssetId } from '@shapeshiftoss/caip'
import { THOR_ROUTER_CONTRACT_MAINNET } from '@shapeshiftoss/contracts'
import type { Asset } from '@shapeshiftoss/types'
import { assertUnreachable, BigNumber, bn, bnOrZero } from '@shapeshiftoss/utils'
import type { Address } from 'viem'
import { encodeFunctionData, parseAbiItem } from 'viem'

import type { SwapperConfig, SwapperName } from '../types'
import { getThorTxData } from './evm'
import type { ThorEvmTradeQuote } from './types'
import { TradeType } from './types'

export const getCallDataFromQuote = async ({
  tradeType,
  data,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  memo: tcMemo,
  expiry,
  config,
  longtailData,
  slippageTolerancePercentageDecimal,
  vault,
  swapperName,
}: Pick<
  ThorEvmTradeQuote,
  | 'vault'
  | 'aggregator'
  | 'data'
  | 'memo'
  | 'tradeType'
  | 'expiry'
  | 'longtailData'
  | 'slippageTolerancePercentageDecimal'
> & {
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  config: SwapperConfig
  sellAsset: Asset
  swapperName: SwapperName
}): Promise<string> => {
  switch (tradeType) {
    case TradeType.L1ToL1: {
      return data
    }
    case TradeType.LongTailToL1: {
      const expectedAmountOut = longtailData?.longtailToL1ExpectedAmountOut ?? '0'
      const amountOutMin = BigInt(
        bnOrZero(expectedAmountOut)
          .times(bn(1).minus(slippageTolerancePercentageDecimal ?? 0))
          .toFixed(0, BigNumber.ROUND_UP),
      )
      const swapInAbiItem = parseAbiItem(
        'function swapIn(address tcRouter, address tcVault, string tcMemo, address token, uint256 amount, uint256 amountOutMin, uint256 deadline)',
      )

      // Long-tails are only supported on mainnet
      const tcRouter = THOR_ROUTER_CONTRACT_MAINNET as Address
      const tcVault = vault as Address
      const token = fromAssetId(sellAsset.assetId).assetReference as Address
      const amount = BigInt(sellAmountIncludingProtocolFeesCryptoBaseUnit)
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
      const tenMinutes = BigInt(600)
      const deadline = currentTimestamp + tenMinutes
      const params = [tcRouter, tcVault, tcMemo, token, amount, amountOutMin, deadline] as const

      const swapInData = encodeFunctionData({
        abi: [swapInAbiItem],
        functionName: 'swapIn',
        args: params,
      })

      return swapInData
    }
    case TradeType.L1ToLongTail: {
      const { data: dataWithAmountOut } = await getThorTxData({
        sellAsset,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        memo: tcMemo,
        expiry,
        config,
        swapperName,
      })

      return dataWithAmountOut
    }
    case TradeType.LongTailToLongTail:
      throw Error(`Unsupported trade type: ${TradeType}`)
    default:
      return assertUnreachable(tradeType)
  }
}
