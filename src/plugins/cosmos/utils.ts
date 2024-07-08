import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'

export const getFeeData = async (asset: Asset) => {
  const adapter = assertGetCosmosSdkChainAdapter(fromAssetId(asset.assetId).chainId)
  const feeData = await adapter.getFeeData({})

  return {
    txFee: feeData.average.txFee,
    gasLimit: feeData.average.chainSpecific.gasLimit,
  }
}
