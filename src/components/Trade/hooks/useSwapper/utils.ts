import { Asset } from '@shapeshiftoss/asset-service'
import { CHAIN_NAMESPACE, ChainId, fromChainId, toAccountId } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { GetTradeQuoteInput, TradeQuote, UtxoSupportedChainIds } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectAccountSpecifiers } from 'state/slices/accountSpecifiersSlice/selectors'
import { accountIdToUtxoParams } from 'state/slices/portfolioSlice/utils'

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

export type Amounts = {
  sellAmount: string
  buyAmount: string
  fiatSellAmount: string
}

export type TradeQuoteInputCommonArgs = Pick<
  GetTradeQuoteInput,
  'sellAmount' | 'sellAsset' | 'buyAsset' | 'sendMax' | 'sellAssetAccountNumber' | 'receiveAddress'
>

// Type guards
export const isSupportedUtxoSwappingChain = (
  chainId: ChainId,
): chainId is UtxoSupportedChainIds => {
  const { chainNamespace } = fromChainId(chainId)
  return chainNamespace === CHAIN_NAMESPACE.Bitcoin
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
