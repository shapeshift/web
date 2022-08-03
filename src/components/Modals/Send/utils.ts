import { Asset } from '@shapeshiftoss/asset-service'
import { ChainId, fromAccountId } from '@shapeshiftoss/caip'
import {
  EvmBaseAdapter,
  EvmChainId,
  FeeDataEstimate,
  UtxoBaseAdapter,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'

export type EstimateFeesInput = {
  cryptoAmount: string
  asset: Asset
  address: string
  sendMax: boolean
  accountId: string
  contractAddress: string | undefined
}

export const estimateFees = ({
  cryptoAmount,
  asset,
  address,
  sendMax,
  accountId,
  contractAddress,
}: EstimateFeesInput): Promise<FeeDataEstimate<ChainId>> => {
  const chainAdapterManager = getChainAdapterManager()
  const { account } = fromAccountId(accountId)
  const value = bnOrZero(cryptoAmount)
    .times(bnOrZero(10).exponentiatedBy(asset.precision))
    .toFixed(0)

  const adapter = chainAdapterManager.get(asset.chainId)
  if (!adapter) throw new Error(`No adapter available for ${asset.chainId}`)

  switch (asset.chainId) {
    case KnownChainIds.CosmosMainnet:
    case KnownChainIds.OsmosisMainnet:
      return adapter.getFeeData({})
    case KnownChainIds.EthereumMainnet:
    case KnownChainIds.AvalancheMainnet:
      return (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: address,
        value,
        chainSpecific: {
          from: account,
          contractAddress,
        },
        sendMax,
      })
    case KnownChainIds.BitcoinMainnet:
    case KnownChainIds.DogecoinMainnet:
    case KnownChainIds.LitecoinMainnet: {
      return (adapter as unknown as UtxoBaseAdapter<UtxoChainId>).getFeeData({
        to: address,
        value,
        chainSpecific: { pubkey: account },
        sendMax,
      })
    }
    default:
      throw new Error('unsupported chain type')
  }
}
