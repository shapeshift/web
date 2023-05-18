import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { GetReceiveAddressArgs } from 'components/Trade/types'
import { type DisplayFeeData, type GetFormFeesArgs } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { type Asset } from 'lib/asset-service'
import { bn, bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import type { SwapperName, Trade, TradeQuote } from 'lib/swapper/api'

const moduleLogger = logger.child({ namespace: ['useSwapper', 'utils'] })

// Pure functions

export const getSendMaxAmount = (
  sellAsset: Asset,
  feeAsset: Asset,
  quote: TradeQuote<KnownChainIds>,
  sellAssetBalance: string,
) => {
  // Only subtract fee if sell asset is the fee asset
  const isFeeAsset = feeAsset.assetId === sellAsset.assetId
  const feeEstimate = bnOrZero(quote?.feeData?.networkFeeCryptoBaseUnit)
  // sell asset balance minus expected fee = maxTradeAmount
  // only subtract if sell asset is fee asset
  return positiveOrZero(
    fromBaseUnit(
      bnOrZero(sellAssetBalance)
        .minus(isFeeAsset ? feeEstimate : 0)
        .toString(),
      sellAsset.precision,
    ),
  ).toString()
}

const getEvmFees = <T extends EvmChainId>(
  trade: Trade<T> | TradeQuote<T>,
  feeAsset: Asset,
  tradeFeeSource: SwapperName,
): DisplayFeeData<EvmChainId> => {
  const networkFeeCryptoPrecision = bnOrZero(trade?.feeData?.networkFeeCryptoBaseUnit)
    .div(bn(10).exponentiatedBy(feeAsset.precision))
    .toFixed()

  return {
    tradeFeeSource,
    buyAssetTradeFeeUsd: trade.feeData.buyAssetTradeFeeUsd,
    sellAssetTradeFeeUsd: trade.feeData.sellAssetTradeFeeUsd,
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
    trade?.feeData?.networkFeeCryptoBaseUnit,
    feeAsset.precision,
  )

  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm:
      return getEvmFees(
        trade as Trade<EvmChainId> | TradeQuote<EvmChainId>,
        feeAsset,
        tradeFeeSource,
      )
    case CHAIN_NAMESPACE.CosmosSdk: {
      return {
        networkFeeCryptoHuman,
        networkFeeCryptoBaseUnit: trade.feeData.networkFeeCryptoBaseUnit ?? '0',
        sellAssetTradeFeeUsd: trade.feeData.sellAssetTradeFeeUsd ?? '',
        buyAssetTradeFeeUsd: trade.feeData.buyAssetTradeFeeUsd ?? '',
        tradeFeeSource,
      }
    }
    case CHAIN_NAMESPACE.Utxo: {
      const utxoTrade = trade as Trade<UtxoChainId>
      return {
        networkFeeCryptoHuman,
        networkFeeCryptoBaseUnit: utxoTrade.feeData.networkFeeCryptoBaseUnit,
        chainSpecific: utxoTrade.feeData.chainSpecific,
        buyAssetTradeFeeUsd: utxoTrade.feeData.buyAssetTradeFeeUsd ?? '',
        tradeFeeSource,
        sellAssetTradeFeeUsd: utxoTrade.feeData.sellAssetTradeFeeUsd ?? '',
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
    moduleLogger.info(e, 'No receive address for buy asset, using default asset pair')
  }
}
