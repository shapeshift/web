import { Asset } from '@shapeshiftoss/asset-service'
import { CHAIN_NAMESPACE, ChainId, fromChainId, toAccountId } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { GetTradeQuoteInput, UtxoSupportedChainIds } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
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
  | 'sellAmount'
  | 'sellAsset'
  | 'buyAsset'
  | 'sendMax'
  | 'sellAssetAccountNumber'
  | 'wallet'
  | 'receiveAddress'
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
  // Get first specifier for receive asset chain id
  // Eventually we may want to customize which account they want to receive trades into
  const receiveAddressAccountSpecifiers = accountSpecifiersList.find(
    specifiers => specifiers[buyAsset.chainId],
  )

  if (!receiveAddressAccountSpecifiers) throw new Error('no receiveAddressAccountSpecifiers')
  const account = receiveAddressAccountSpecifiers[buyAsset.chainId]
  if (!account) throw new Error(`no account for ${buyAsset.chainId}`)

  const { chainId } = buyAsset
  const accountId = toAccountId({ chainId, account })

  const { accountType, utxoParams } = accountIdToUtxoParams(accountId, 0)

  const receiveAddress = await chainAdapter.getAddress({ wallet, accountType, ...utxoParams })
  return receiveAddress
}

export const getUtxoParams = (sellAssetAccount: string) => {
  if (!sellAssetAccount) throw new Error('No UTXO account specifier')
  return accountIdToUtxoParams(sellAssetAccount, 0)
}
