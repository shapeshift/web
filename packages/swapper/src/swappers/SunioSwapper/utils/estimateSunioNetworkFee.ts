import { bn } from '@shapeshiftoss/utils'
import { TronWeb } from 'tronweb'

import type { SunioRoute } from '../types'
import {
  buildSwapExactInputParameters,
  SUNIO_SWAP_EXACT_INPUT_SELECTOR,
} from './buildSwapContractCall'
import { buildSwapRouteParameters } from './buildSwapRouteParameters'
import {
  DEFAULT_SLIPPAGE_PERCENTAGE,
  SUNIO_FALLBACK_SWAP_ENERGY_NATIVE,
  SUNIO_FALLBACK_SWAP_ENERGY_TRC20,
  SUNIO_SMART_ROUTER_CONTRACT,
} from './constants'

type EstimateSunioNetworkFeeArgs = {
  rpcUrl: string
  apiKey: string
  route: SunioRoute
  sellAmountCryptoBaseUnit: string
  isSellingNativeTrx: boolean
  address: string | undefined
  slippageTolerancePercentageDecimal: string | undefined
}

// Estimates the network fee (in TRX base units) for a Sun.io swap. The router sponsors only ~1%
// of energy (origin_energy_usage); the user pays the rest, so we simulate the real swapExactInput
// call when we have an address to estimate from. The simulation reverts before approval for TRC20
// sells (and when the account lacks the sell balance), so we fall back to a conservative per-sell-
// type constant. Used both at quote time and re-run at confirm time, where a now-granted allowance
// lets the simulation produce the true cost.
export const estimateSunioNetworkFeeCryptoBaseUnit = async ({
  rpcUrl,
  apiKey,
  route,
  sellAmountCryptoBaseUnit,
  isSellingNativeTrx,
  address,
  slippageTolerancePercentageDecimal,
}: EstimateSunioNetworkFeeArgs): Promise<string> => {
  const tronGridHeaders: Record<string, string> = apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {}
  const tronWeb = new TronWeb({ fullHost: rpcUrl, headers: tronGridHeaders })

  // Live network prices, defaulting if the node is unavailable so we still produce a fee
  const { bandwidthPrice, energyPrice } = await (async () => {
    try {
      const params = await tronWeb.trx.getChainParameters()
      return {
        bandwidthPrice: params.find(p => p.key === 'getTransactionFee')?.value ?? 1000,
        energyPrice: params.find(p => p.key === 'getEnergyFee')?.value ?? 100,
      }
    } catch {
      return { bandwidthPrice: 1000, energyPrice: 100 }
    }
  })()

  // Recipient activation can only be checked with an address
  const accountActivationFee = await (async () => {
    if (!address) return 0
    try {
      const recipientInfoResponse = await fetch(`${rpcUrl}/wallet/getaccount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tronGridHeaders },
        body: JSON.stringify({ address, visible: true }),
      })
      const recipientInfo = await recipientInfoResponse.json()
      const recipientExists = recipientInfo && Object.keys(recipientInfo).length > 1
      return recipientExists ? 0 : 1_000_000 // 1 TRX
    } catch {
      return 0
    }
  })()

  const energyUsed = await (async () => {
    // TRC20 sells cost far more energy than native sells (the extra transferFrom token pull)
    const fallbackEnergy = isSellingNativeTrx
      ? SUNIO_FALLBACK_SWAP_ENERGY_NATIVE
      : SUNIO_FALLBACK_SWAP_ENERGY_TRC20
    if (!address) return fallbackEnergy
    try {
      const routeParams = buildSwapRouteParameters(
        route,
        sellAmountCryptoBaseUnit,
        '0',
        address,
        slippageTolerancePercentageDecimal ?? DEFAULT_SLIPPAGE_PERCENTAGE,
      )

      const callValue = isSellingNativeTrx ? Number(sellAmountCryptoBaseUnit) : 0

      const result = await tronWeb.transactionBuilder.triggerConstantContract(
        SUNIO_SMART_ROUTER_CONTRACT,
        SUNIO_SWAP_EXACT_INPUT_SELECTOR,
        { callValue },
        buildSwapExactInputParameters(routeParams),
        address,
      )
      return result?.energy_used || fallbackEnergy
    } catch {
      return fallbackEnergy
    }
  })()

  // 1.2x safety margin for energy price/usage variance between estimate and execution
  const energyFee = Math.ceil(energyUsed * energyPrice * 1.2)
  const bandwidthFee = 1100 * bandwidthPrice

  return bn(energyFee).plus(bandwidthFee).plus(accountActivationFee).toFixed(0)
}
