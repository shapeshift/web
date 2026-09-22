import { tronAssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import type { SunioRoute } from '../types'
import { buildSunioSwapCalldata } from './buildSwapContractCall'
import {
  DEFAULT_SLIPPAGE_PERCENTAGE,
  SUNIO_FALLBACK_SWAP_BANDWIDTH_BYTES,
  SUNIO_FALLBACK_SWAP_ENERGY_NATIVE,
  SUNIO_FALLBACK_SWAP_ENERGY_TRC20,
  SUNIO_SMART_ROUTER_CONTRACT,
  SUNIO_SWAP_DEADLINE_MS,
} from './constants'

type BaseArgs = {
  route: SunioRoute
  sellAmountCryptoBaseUnit: string
  buyAmountCryptoBaseUnit: string
}

export type GetSunioStepDataArgs = StepDataArgs<BaseArgs>

type TronTxBuildData = Extract<TxBuildData, { type: 'tron' }>

type SunioRateStepData = { networkFeeCryptoBaseUnit: string | undefined }
type SunioQuoteStepData = {
  transactionData: TronTxBuildData
  networkFeeCryptoBaseUnit: string
  deadline: number
}

export function getSunioStepData(
  args: Extract<GetSunioStepDataArgs, { type: 'rate' }>,
): Promise<Result<SunioRateStepData, SwapErrorRight>>
export function getSunioStepData(
  args: Extract<GetSunioStepDataArgs, { type: 'quote' }>,
): Promise<Result<SunioQuoteStepData, SwapErrorRight>>
export async function getSunioStepData(
  args: GetSunioStepDataArgs,
): Promise<Result<SunioRateStepData | SunioQuoteStepData, SwapErrorRight>> {
  const { type, route, sellAsset, sellAmountCryptoBaseUnit, buyAmountCryptoBaseUnit, from, input } =
    args

  const adapter = args.deps.assertGetTronChainAdapter(sellAsset.chainId)
  const isNativeSell = sellAsset.assetId === tronAssetId
  const value = isNativeSell ? sellAmountCryptoBaseUnit : '0'
  // The router reverts past this, so the quote expires with it
  const deadline = Date.now() + SUNIO_SWAP_DEADLINE_MS

  const buildTransactionData = (recipient: string): TronTxBuildData => ({
    type: 'tron',
    to: SUNIO_SMART_ROUTER_CONTRACT,
    value,
    data: buildSunioSwapCalldata({
      route,
      sellAmountCryptoBaseUnit,
      minBuyAmountCryptoBaseUnit: buyAmountCryptoBaseUnit,
      recipient,
      slippageTolerancePercentageDecimal:
        input.slippageTolerancePercentageDecimal ?? DEFAULT_SLIPPAGE_PERCENTAGE,
      deadline,
    }),
  })

  const estimate = async (transactionData: TronTxBuildData) => {
    const { fast } = await adapter.getFeeData({
      to: transactionData.to,
      value: transactionData.value,
      chainSpecific: { from, data: transactionData.data },
    })

    return fast.txFee
  }

  if (type === 'rate') {
    const networkFeeCryptoBaseUnit = await (async () => {
      try {
        if (from) return await estimate(buildTransactionData(from))
      } catch {}

      try {
        const { energyPrice, bandwidthPrice } = await adapter.httpProvider.getChainPrices()
        const energy = isNativeSell
          ? SUNIO_FALLBACK_SWAP_ENERGY_NATIVE
          : SUNIO_FALLBACK_SWAP_ENERGY_TRC20

        return bn(energy)
          .times(energyPrice)
          .plus(bn(SUNIO_FALLBACK_SWAP_BANDWIDTH_BYTES).times(bandwidthPrice))
          .toFixed(0)
      } catch {}
    })()

    const stepData: SunioRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  const transactionData = buildTransactionData(input.receiveAddress)

  try {
    const stepData: SunioQuoteStepData = {
      transactionData,
      networkFeeCryptoBaseUnit: await estimate(transactionData),
      deadline,
    }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getSunioStepData', error))
  }
}
