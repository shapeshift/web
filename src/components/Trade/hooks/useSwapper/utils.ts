import { Asset } from '@shapeshiftoss/asset-service'
import { ChainId, toAccountId } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
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

// Pure functions
export const isSupportedSwappingChain = (chainId: ChainId): chainId is SupportedSwappingChains => {
  return (
    chainId === KnownChainIds.EthereumMainnet ||
    chainId === KnownChainIds.AvalancheMainnet ||
    chainId === KnownChainIds.OsmosisMainnet ||
    chainId === KnownChainIds.CosmosMainnet
  )
}

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
