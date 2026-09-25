import { tronAssetId } from '@shapeshiftoss/caip'
import { tron } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import type { TronContractCall } from '../../../utils/tron'
import {
  getTronContractCallFallbackFeeCryptoBaseUnit,
  getTronContractCallNetworkFeeCryptoBaseUnit,
  TRON_PLACEHOLDER_ADDRESS,
} from '../../../utils/tron'
import type { SunioRoute } from '../types'
import { buildSunioSwapCalldata } from './buildSwapContractCall'
import {
  DEFAULT_SLIPPAGE_PERCENTAGE,
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
  const fallbackEnergy = isNativeSell
    ? SUNIO_FALLBACK_SWAP_ENERGY_NATIVE
    : SUNIO_FALLBACK_SWAP_ENERGY_TRC20
  // The router reverts past this, so the quote expires with it
  const deadline = Date.now() + SUNIO_SWAP_DEADLINE_MS

  const buildCall = (recipient: string): TronContractCall => ({
    to: SUNIO_SMART_ROUTER_CONTRACT,
    value: isNativeSell ? sellAmountCryptoBaseUnit : '0',
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

  if (type === 'rate') {
    const networkFeeCryptoBaseUnit = await (async () => {
      try {
        if (from) {
          const { to, value, data } = buildCall(from)
          const { fast } = await adapter.getFeeData({ to, value, chainSpecific: { from, data } })

          return fast.txFee
        }
      } catch {}

      try {
        return await getTronContractCallFallbackFeeCryptoBaseUnit({
          adapter,
          energy: fallbackEnergy,
          bandwidthBytes: tron.getTronContractCallBandwidthBytes(
            buildCall(from ?? TRON_PLACEHOLDER_ADDRESS).data,
          ),
          contractAddress: SUNIO_SMART_ROUTER_CONTRACT,
          fullEnergyOnShareLookupFailure: true,
        })
      } catch {}
    })()

    const stepData: SunioRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  const call = buildCall(input.receiveAddress)

  try {
    const stepData: SunioQuoteStepData = {
      transactionData: { type: 'tron', ...call },
      networkFeeCryptoBaseUnit: await getTronContractCallNetworkFeeCryptoBaseUnit({
        adapter,
        transactionData: call,
        from,
        sellAsset,
        sellAmountCryptoBaseUnit,
        spenderAddress: SUNIO_SMART_ROUTER_CONTRACT,
        fallbackEnergy,
      }),
      deadline,
    }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getSunioStepData', error))
  }
}
