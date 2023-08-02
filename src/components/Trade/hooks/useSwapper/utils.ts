import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { DisplayFeeData, GetFormFeesArgs, GetReceiveAddressArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { SwapperName, TradeBase } from 'lib/swapper/api'

const getEvmFees = <T extends EvmChainId>(
  trade: TradeBase<T>,
  feeAsset: Asset,
  tradeFeeSource: SwapperName,
): DisplayFeeData<EvmChainId> => {
  const networkFeeCryptoPrecision = bnOrZero(trade?.feeData?.networkFeeCryptoBaseUnit)
    .div(bn(10).exponentiatedBy(feeAsset.precision))
    .toFixed()

  return {
    tradeFeeSource,
    protocolFees: trade.feeData.protocolFees,
    networkFeeCryptoHuman: networkFeeCryptoPrecision,
    networkFeeCryptoBaseUnit: trade?.feeData?.networkFeeCryptoBaseUnit ?? '0',
  }
}

export const getFormFees = ({
  trade,
  sellAsset,
  tradeFeeSource,
  feeAsset,
}: GetFormFeesArgs): DisplayFeeData<KnownChainIds> => {
  const networkFeeCryptoHuman = fromBaseUnit(
    trade.feeData?.networkFeeCryptoBaseUnit ?? '0',
    feeAsset.precision,
  )

  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm:
      return getEvmFees(trade, feeAsset, tradeFeeSource)
    case CHAIN_NAMESPACE.CosmosSdk: {
      return {
        networkFeeCryptoHuman,
        networkFeeCryptoBaseUnit: trade.feeData.networkFeeCryptoBaseUnit ?? '0',
        protocolFees: trade.feeData.protocolFees,
        tradeFeeSource,
      }
    }
    case CHAIN_NAMESPACE.Utxo: {
      return {
        networkFeeCryptoHuman,
        networkFeeCryptoBaseUnit: trade.feeData.networkFeeCryptoBaseUnit,
        chainSpecific: trade.feeData.chainSpecific,
        protocolFees: trade.feeData.protocolFees,
        tradeFeeSource,
      }
    }
    default:
      throw new Error('Unsupported chain ' + sellAsset.chainId)
  }
}

export const getReceiveAddress = async ({
  asset,
  wallet,
  accountMetadata,
}: GetReceiveAddressArgs): Promise<string | undefined> => {
  const { chainId } = fromAssetId(asset.assetId)
  const { accountType, bip44Params } = accountMetadata
  const chainAdapter = getChainAdapterManager().get(chainId)
  if (!(chainAdapter && wallet)) return
  const { accountNumber } = bip44Params
  try {
    return await chainAdapter.getAddress({ wallet, accountNumber, accountType })
  } catch (e) {
    console.log(e)
  }
}
