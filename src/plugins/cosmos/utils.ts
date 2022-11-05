import type { Asset } from '@keepkey/asset-service'
import { fromAssetId } from '@keepkey/caip'
import type {
  cosmossdk,
  CosmosSdkBaseAdapter,
  CosmosSdkChainId,
  FeeDataKey,
} from '@keepkey/chain-adapters'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'

export type FeePriceValueHuman = {
  fiatFee: string
  txFee: string
  chainSpecific: cosmossdk.FeeData
}
export type FeePrice = {
  [key in FeeDataKey]: FeePriceValueHuman
}

export const getFormFees = async (asset: Asset, fiatRate: string) => {
  // We don't use all of these fields for the return value but this is our standard FeeDataEstimate fees, for consistency
  const initialFees = {
    slow: {
      fiatFee: '',
      txFee: '',
      chainSpecific: {
        gasLimit: '',
      },
    },
    average: {
      fiatFee: '',
      txFee: '',
      chainSpecific: {
        gasLimit: '',
      },
    },
    fast: {
      fiatFee: '',
      txFee: '',
      chainSpecific: {
        gasLimit: '',
      },
    },
  }

  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(
    fromAssetId(asset.assetId).chainId,
  ) as unknown as CosmosSdkBaseAdapter<CosmosSdkChainId>

  const feeData = await adapter.getFeeData({})

  if (!adapter)
    return {
      gasLimit: initialFees.average.chainSpecific.gasLimit,
      gasPrice: initialFees.average.txFee,
    }

  const adapterFees = (Object.keys(feeData) as FeeDataKey[]).reduce<FeePrice>(
    (acc: any, key: FeeDataKey) => {
      const chainSpecific = feeData[key].chainSpecific
      const txFee = bnOrZero(feeData[key].txFee)
        .dividedBy(bnOrZero(`1e+${asset.precision}`))
        .toPrecision()
      const fiatFee = bnOrZero(txFee).times(fiatRate).toPrecision()
      acc[key] = { txFee, fiatFee, chainSpecific }
      return acc
    },
    initialFees,
  )

  return {
    gasLimit: adapterFees.average.chainSpecific.gasLimit,
    gasPrice: adapterFees.average.txFee,
  }
}
