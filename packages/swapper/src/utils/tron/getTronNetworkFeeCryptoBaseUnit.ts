import { fromAssetId } from '@shapeshiftoss/caip'
import { tron } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { bn, isToken } from '@shapeshiftoss/utils'

import type { TxBuildData } from '../../types'

export type TronContractCall = Omit<
  Extract<TxBuildData, { type: 'tron' }>,
  'type' | 'data' | 'memo'
> & { data: string }

type GetTronContractCallFallbackFeeArgs = {
  adapter: tron.ChainAdapter
  energy: string
  bandwidthBytes: number
}

// A measured worst-case energy under the adapter's margin, at live prices
export const getTronContractCallFallbackFeeCryptoBaseUnit = async ({
  adapter,
  energy,
  bandwidthBytes,
}: GetTronContractCallFallbackFeeArgs): Promise<string> => {
  const { energyPrice, bandwidthPrice } = await adapter.httpProvider.getChainPrices()

  return bn(energy)
    .times(tron.TRON_ENERGY_SAFETY_MARGIN)
    .times(energyPrice)
    .plus(bn(bandwidthBytes).times(bandwidthPrice))
    .toFixed(0)
}

type GetTronContractCallNetworkFeeArgs = {
  adapter: tron.ChainAdapter
  transactionData: TronContractCall
  from: string
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  // the contract the seller approves - base58 or hex
  spenderAddress: string
  // measured worst case for this call, used only when the allowance isn't granted yet
  fallbackEnergy: string
}

// Quote arm: a funded token sell that reverts for want of its allowance prices the measured worst case, anything else throws
export const getTronContractCallNetworkFeeCryptoBaseUnit = async ({
  adapter,
  transactionData,
  from,
  sellAsset,
  sellAmountCryptoBaseUnit,
  spenderAddress,
  fallbackEnergy,
}: GetTronContractCallNetworkFeeArgs): Promise<string> => {
  const { to, value, data } = transactionData

  try {
    const { fast } = await adapter.getFeeData({ to, value, chainSpecific: { from, data } })

    return fast.txFee
  } catch (error) {
    if (!isToken(sellAsset.assetId)) throw error

    const contractAddress = fromAssetId(sellAsset.assetId).assetReference
    const { httpProvider } = adapter

    const [allowance, balance] = await Promise.all([
      httpProvider.getTrc20Allowance({
        contractAddress,
        owner: from,
        spender: tron.toTronBase58(spenderAddress),
      }),
      httpProvider.getTRC20Balance({ address: from, contractAddress }),
    ])

    const sellAmount = BigInt(sellAmountCryptoBaseUnit)
    if (BigInt(allowance) >= sellAmount || BigInt(balance) < sellAmount) throw error

    return getTronContractCallFallbackFeeCryptoBaseUnit({
      adapter,
      energy: fallbackEnergy,
      bandwidthBytes: tron.getTronContractCallBandwidthBytes(data),
    })
  }
}
