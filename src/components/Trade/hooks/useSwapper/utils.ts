import { type Asset } from '@shapeshiftoss/asset-service'
import {
  type ChainId,
  avalancheAssetId,
  bchAssetId,
  btcAssetId,
  CHAIN_NAMESPACE,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  foxAssetId,
  fromAssetId,
  ltcAssetId,
  optimismAssetId,
  osmosisAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'
import { type EvmChainId } from '@shapeshiftoss/chain-adapters'
import { type Trade, type TradeQuote, type UtxoSupportedChainIds } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { GetReceiveAddressArgs } from 'components/Trade/types'
import {
  type AssetIdTradePair,
  type DisplayFeeData,
  type GetFormFeesArgs,
} from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import { type FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

const moduleLogger = logger.child({ namespace: ['useSwapper', 'utils'] })

// Pure functions
export const filterAssetsByIds = (assets: Asset[], assetIds: string[]) => {
  const assetIdMap = Object.fromEntries(assetIds.map(assetId => [assetId, true]))
  return assets.filter(asset => assetIdMap[asset.assetId])
}

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
  tradeFeeSource: string,
): DisplayFeeData<EvmChainId> => {
  const networkFeeCryptoPrecision = bnOrZero(trade?.feeData?.networkFeeCryptoBaseUnit)
    .div(bn(10).exponentiatedBy(feeAsset.precision))
    .toFixed()

  const approvalFeeCryptoPrecision = bnOrZero(trade.feeData.chainSpecific.approvalFeeCryptoBaseUnit)
    .dividedBy(bn(10).exponentiatedBy(feeAsset.precision))
    .toString()
  const totalFeeCryptoPrecision = bnOrZero(networkFeeCryptoPrecision)
    .plus(approvalFeeCryptoPrecision)
    .toString()
  const gasPriceCryptoBaseUnit = bnOrZero(
    trade.feeData.chainSpecific.gasPriceCryptoBaseUnit,
  ).toString()
  const estimatedGasCryptoBaseUnit = bnOrZero(trade.feeData.chainSpecific.estimatedGas).toString()

  return {
    chainSpecific: {
      approvalFeeCryptoBaseUnit: trade.feeData.chainSpecific.approvalFeeCryptoBaseUnit,
      gasPriceCryptoBaseUnit,
      estimatedGas: estimatedGasCryptoBaseUnit,
      totalFee: totalFeeCryptoPrecision,
    },
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
      const utxoTrade = trade as Trade<UtxoSupportedChainIds>
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

export const getDefaultAssetIdPairByChainId = (
  buyAssetChainId: ChainId | undefined,
  featureFlags: FeatureFlags,
): AssetIdTradePair => {
  const osmosisEnabled = featureFlags.OsmosisSwap
  const ethFoxPair = {
    sellAssetId: ethAssetId,
    buyAssetId: foxAssetId,
  }

  switch (buyAssetChainId) {
    case KnownChainIds.AvalancheMainnet:
      return {
        sellAssetId: avalancheAssetId,
        buyAssetId: 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
      }
    case KnownChainIds.OptimismMainnet:
      return featureFlags.OptimismZrx
        ? {
            sellAssetId: optimismAssetId,
            buyAssetId: 'eip155:10/erc20:0x4200000000000000000000000000000000000042',
          }
        : ethFoxPair
    case KnownChainIds.CosmosMainnet:
      return osmosisEnabled
        ? { sellAssetId: cosmosAssetId, buyAssetId: osmosisAssetId }
        : ethFoxPair
    case KnownChainIds.OsmosisMainnet:
      return osmosisEnabled
        ? { sellAssetId: osmosisAssetId, buyAssetId: cosmosAssetId }
        : ethFoxPair
    case KnownChainIds.BitcoinMainnet:
      return {
        sellAssetId: ethAssetId,
        buyAssetId: btcAssetId,
      }
    case KnownChainIds.BitcoinCashMainnet:
      return {
        sellAssetId: ethAssetId,
        buyAssetId: bchAssetId,
      }
    case KnownChainIds.DogecoinMainnet:
      return {
        sellAssetId: ethAssetId,
        buyAssetId: dogeAssetId,
      }
    case KnownChainIds.LitecoinMainnet:
      return {
        sellAssetId: ethAssetId,
        buyAssetId: ltcAssetId,
      }
    case KnownChainIds.ThorchainMainnet:
      return {
        sellAssetId: ethAssetId,
        buyAssetId: thorchainAssetId,
      }
    case KnownChainIds.EthereumMainnet:
    default:
      return ethFoxPair
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
