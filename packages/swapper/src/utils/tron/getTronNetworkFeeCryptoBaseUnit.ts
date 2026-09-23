import { fromAssetId } from '@shapeshiftoss/caip'
import { tron } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { bn, isToken } from '@shapeshiftoss/utils'

export type TronContractCall = { to: string; value: string; data: string }

type GetTronContractCallFallbackFeeArgs = {
  adapter: tron.ChainAdapter
  data: string
  energy: string
}

// A measured worst-case energy at live prices, with bandwidth sized from the real calldata
export const getTronContractCallFallbackFeeCryptoBaseUnit = async ({
  adapter,
  data,
  energy,
}: GetTronContractCallFallbackFeeArgs): Promise<string> => {
  const { energyPrice, bandwidthPrice } = await adapter.httpProvider.getChainPrices()

  return bn(energy)
    .times(energyPrice)
    .plus(bn(tron.getTronContractCallBandwidthBytes(data)).times(bandwidthPrice))
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

// Quote arm. Tron has no state override, so a token sell can't be simulated before its allowance
// exists. Energy isn't a tx constraint - feeLimit caps it and the chain charges actual usage - so
// the estimate only gates balance and display: a revert with an insufficient allowance prices the
// measured worst case and the quote stays executable. Every other failure throws.
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

    const allowance = await adapter.httpProvider.getTrc20Allowance({
      contractAddress: fromAssetId(sellAsset.assetId).assetReference,
      owner: from,
      spender: tron.toTronBase58(spenderAddress),
    })

    if (BigInt(allowance) >= BigInt(sellAmountCryptoBaseUnit)) throw error

    return getTronContractCallFallbackFeeCryptoBaseUnit({ adapter, data, energy: fallbackEnergy })
  }
}
