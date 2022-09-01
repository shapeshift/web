import { type Asset } from '@shapeshiftoss/asset-service'
import {
  type AssetId,
  type ChainId,
  avalancheAssetId,
  CHAIN_NAMESPACE,
  cosmosAssetId,
  ethAssetId,
  fromAssetId,
  fromChainId,
  osmosisAssetId,
  toAccountId,
} from '@shapeshiftoss/caip'
import { type EvmChainId, ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { type HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  type GetTradeQuoteInput,
  type Swapper,
  type Trade,
  type TradeQuote,
  type UtxoSupportedChainIds,
} from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { type DisplayFeeData } from 'components/Trade/types'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectAccountSpecifiers } from 'state/slices/accountSpecifiersSlice/selectors'
import { accountIdToUtxoParams } from 'state/slices/portfolioSlice/utils'
import { type FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

// Types
type SupportedSwappingChains =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.AvalancheMainnet
  | KnownChainIds.OsmosisMainnet
  | KnownChainIds.CosmosMainnet

type GetFirstReceiveAddressArgs = {
  accountSpecifiersList: ReturnType<typeof selectAccountSpecifiers>
  buyAsset: Asset
  chainAdapter: ChainAdapter<ChainId>
  wallet: HDWallet
}

type GetFirstReceiveAddress = (args: GetFirstReceiveAddressArgs) => Promise<string>

export type TradeQuoteInputCommonArgs = Pick<
  GetTradeQuoteInput,
  'sellAmount' | 'sellAsset' | 'buyAsset' | 'sendMax' | 'sellAssetAccountNumber' | 'receiveAddress'
>

type GetFormFeesArgs = {
  trade: Trade<KnownChainIds> | TradeQuote<KnownChainIds>
  sellAsset: Asset
  tradeFeeSource: string
  feeAsset: Asset
}

// Type guards
export const isSupportedUtxoSwappingChain = (
  chainId: ChainId,
): chainId is UtxoSupportedChainIds => {
  const { chainNamespace } = fromChainId(chainId)
  return chainNamespace === CHAIN_NAMESPACE.Utxo
}

export const isSupportedNoneUtxoSwappingChain = (
  chainId: ChainId,
): chainId is SupportedSwappingChains => {
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

  const { accountType, utxoParams } = accountIdToUtxoParams(accountId, 0)

  return await chainAdapter.getAddress({ wallet, accountType, ...utxoParams })
}

export const getUtxoParams = (sellAssetAccount: string) => {
  if (!sellAssetAccount) throw new Error('No UTXO account specifier')
  return accountIdToUtxoParams(sellAssetAccount, 0)
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
    case CHAIN_NAMESPACE.Ethereum:
      return getEvmFees(
        trade as Trade<EvmChainId> | TradeQuote<EvmChainId>,
        feeAsset,
        tradeFeeSource,
      )
    case CHAIN_NAMESPACE.Cosmos: {
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
): AssetId[] => {
  const osmosisEnabled = featureFlags.Osmosis
  const ethFoxPair = [
    ethAssetId,
    'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d' as AssetId,
  ]
  switch (buyAssetChainId) {
    case KnownChainIds.AvalancheMainnet:
      return [
        avalancheAssetId,
        'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab' as AssetId,
      ]
    case KnownChainIds.CosmosMainnet:
      return osmosisEnabled ? [cosmosAssetId, osmosisAssetId] : ethFoxPair
    case KnownChainIds.OsmosisMainnet:
      return osmosisEnabled ? [osmosisAssetId, cosmosAssetId] : ethFoxPair
    case KnownChainIds.EthereumMainnet:
    default:
      return ethFoxPair
  }
}
