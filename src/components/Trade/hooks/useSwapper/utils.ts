import { type Asset } from '@shapeshiftoss/asset-service'
import {
  type AssetId,
  type ChainId,
  avalancheAssetId,
  CHAIN_NAMESPACE,
  cosmosAssetId,
  ethAssetId,
  foxAssetId,
  fromAssetId,
  fromChainId,
  osmosisAssetId,
  toAccountId,
} from '@shapeshiftoss/caip'
import { type EvmChainId } from '@shapeshiftoss/chain-adapters'
import {
  type Swapper,
  type Trade,
  type TradeQuote,
  type UtxoSupportedChainIds,
} from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import {
  type AssetIdTradePair,
  type DisplayFeeData,
  type GetFirstReceiveAddress,
  type GetFormFeesArgs,
  type SupportedSwappingChain,
} from 'components/Trade/types'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { accountIdToUtxoParams } from 'state/slices/portfolioSlice/utils'
import { type FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

// Type guards
export const isSupportedUtxoSwappingChain = (
  chainId: ChainId,
): chainId is UtxoSupportedChainIds => {
  const { chainNamespace } = fromChainId(chainId)
  return chainNamespace === CHAIN_NAMESPACE.Utxo
}

export const isSupportedNonUtxoSwappingChain = (
  chainId: ChainId,
): chainId is SupportedSwappingChain => {
  return (
    chainId === KnownChainIds.EthereumMainnet ||
    chainId === KnownChainIds.AvalancheMainnet ||
    chainId === KnownChainIds.OsmosisMainnet ||
    chainId === KnownChainIds.CosmosMainnet
  )
}

// Pure functions
export const getFirstReceiveAddress: GetFirstReceiveAddress = async ({
  accountSpecifiersList,
  buyAsset,
  chainAdapter,
  wallet,
}) => {
  const receiveAddressAccountSpecifiers = accountSpecifiersList.find(
    specifiers => specifiers[buyAsset.chainId],
  )

  if (!receiveAddressAccountSpecifiers) throw new Error('no receiveAddressAccountSpecifiers')
  const account = receiveAddressAccountSpecifiers[buyAsset.chainId]
  if (!account) throw new Error(`no account for ${buyAsset.chainId}`)

  const { chainId } = buyAsset
  const accountId = toAccountId({ chainId, account })

  // TODO accountType and accountNumber need to come from account metadata
  const { accountType } = accountIdToUtxoParams(accountId, 0)
  const bip44Params = chainAdapter.getBIP44Params({ accountNumber: 0 })
  return await chainAdapter.getAddress({ wallet, accountType, bip44Params })
}

export const getUtxoParams = (sellAssetAccountId: string) => {
  if (!sellAssetAccountId) throw new Error('No UTXO account specifier')
  return accountIdToUtxoParams(sellAssetAccountId, 0)
}

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
  const feeEstimate = bnOrZero(quote?.feeData?.fee)
  // sell asset balance minus expected fee = maxTradeAmount
  // only subtract if sell asset is fee asset
  return fromBaseUnit(
    bnOrZero(sellAssetBalance)
      .minus(isFeeAsset ? feeEstimate : 0)
      .toString(),
    sellAsset.precision,
  )
}

const getEvmFees = <T extends EvmChainId>(
  trade: Trade<T> | TradeQuote<T>,
  feeAsset: Asset,
  tradeFeeSource: string,
): DisplayFeeData<T> => {
  // The "gas" fee paid to the network for the transaction
  const feeBN = bnOrZero(trade?.feeData?.fee).dividedBy(bn(10).exponentiatedBy(feeAsset.precision))
  const fee = feeBN.toString()
  const approvalFee = bnOrZero(trade.feeData.chainSpecific.approvalFee)
    .dividedBy(bn(10).exponentiatedBy(feeAsset.precision))
    .toString()
  const totalFee = feeBN.plus(approvalFee).toString()
  const gasPrice = bnOrZero(trade.feeData.chainSpecific.gasPrice).toString()
  const estimatedGas = bnOrZero(trade.feeData.chainSpecific.estimatedGas).toString()

  return {
    fee,
    chainSpecific: {
      approvalFee,
      gasPrice,
      estimatedGas,
      totalFee,
    },
    // The fee paid to the protocol for the transaction
    tradeFee: trade.feeData.tradeFee,
    tradeFeeSource,
  } as DisplayFeeData<T>
}

export const getFormFees = ({
  trade,
  sellAsset,
  tradeFeeSource,
  feeAsset,
}: GetFormFeesArgs): DisplayFeeData<KnownChainIds> => {
  const feeBN = bnOrZero(trade?.feeData?.fee).dividedBy(bn(10).exponentiatedBy(feeAsset.precision))
  const fee = feeBN.toString()
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
        fee,
        tradeFee: trade.feeData.tradeFee,
        tradeFeeSource: trade.sources[0].name,
      }
    }
    case CHAIN_NAMESPACE.Utxo: {
      const utxoTrade = trade as Trade<UtxoSupportedChainIds>
      return {
        fee,
        chainSpecific: utxoTrade.feeData.chainSpecific,
        tradeFee: utxoTrade.feeData.tradeFee,
        tradeFeeSource,
      }
    }
    default:
      throw new Error('Unsupported chain ' + sellAsset.chainId)
  }
}

export const getBestSwapperFromArgs = async (
  buyAssetId: AssetId,
  sellAssetId: AssetId,
  featureFlags: FeatureFlags,
): Promise<Swapper<ChainId>> => {
  const swapperManager = await getSwapperManager(featureFlags)
  const swapper = await swapperManager.getBestSwapper({
    buyAssetId,
    sellAssetId,
  })
  if (!swapper) throw new Error('swapper is undefined')
  return swapper
}

export const getDefaultAssetIdPairByChainId = (
  buyAssetChainId: ChainId | undefined,
  featureFlags: FeatureFlags,
): AssetIdTradePair => {
  const osmosisEnabled = featureFlags.Osmosis
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
    case KnownChainIds.CosmosMainnet:
      return osmosisEnabled
        ? { sellAssetId: cosmosAssetId, buyAssetId: osmosisAssetId }
        : ethFoxPair
    case KnownChainIds.OsmosisMainnet:
      return osmosisEnabled
        ? { sellAssetId: osmosisAssetId, buyAssetId: cosmosAssetId }
        : ethFoxPair
    case KnownChainIds.EthereumMainnet:
    default:
      return ethFoxPair
  }
}
