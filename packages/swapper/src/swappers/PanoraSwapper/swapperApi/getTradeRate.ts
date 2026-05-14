import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { GetTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import { PANORA_INTEGRATOR_FEE_ADDRESS } from '../utils/constants'
import { getPanoraTradeData } from './getPanoraTradeData'

const DUMMY_WALLET_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  } = input

  const slippagePercentage = bnOrZero(
    slippageTolerancePercentageDecimal ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Panora),
  )
    .times(100)
    .toNumber()

  const walletAddress = receiveAddress ?? DUMMY_WALLET_ADDRESS

  // No integrator fee address is configured yet, so Panora cannot route an affiliate fee
  // to the DAO; zero it out rather than displaying a fee that is not collected.
  const appliedAffiliateBps = PANORA_INTEGRATOR_FEE_ADDRESS ? affiliateBps : '0'

  const tradeDataResult = await getPanoraTradeData({
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    receiveAddress: walletAddress,
    affiliateBps: appliedAffiliateBps,
    slippagePercentage,
    config: deps.config,
  })

  if (tradeDataResult.isErr()) return Err(tradeDataResult.unwrapErr())

  const { buyAmountAfterFeesCryptoBaseUnit, rate, protocolFees } = tradeDataResult.unwrap()

  try {
    const estimatedGas = '200000'

    const tradeRate: TradeRate = {
      id: uuid(),
      quoteOrRate: 'rate',
      rate,
      affiliateBps: appliedAffiliateBps,
      receiveAddress,
      slippageTolerancePercentageDecimal,
      swapperName: SwapperName.Panora,
      steps: [
        {
          accountNumber: undefined,
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
          feeData: {
            protocolFees,
            networkFeeCryptoBaseUnit: estimatedGas,
          },
          rate,
          source: SwapperName.Panora,
          buyAsset,
          sellAsset,
          allowanceContract: '0x0',
          estimatedExecutionTimeMs: undefined,
          affiliateFee: buildAffiliateFee({
            strategy: 'buy_asset',
            affiliateBps: appliedAffiliateBps,
            sellAsset,
            buyAsset,
            sellAmountCryptoBaseUnit: sellAmount,
            buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
            isEstimate: true,
          }),
        },
      ],
    }

    return tradeDataResult.map(() => [tradeRate])
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting Panora rate',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}
