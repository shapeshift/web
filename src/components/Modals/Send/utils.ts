import { Asset } from '@shapeshiftoss/asset-service'
import { CHAIN_NAMESPACE, ChainId, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import {
  EvmBaseAdapter,
  EvmChainId,
  FeeDataEstimate,
  UtxoBaseAdapter,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
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

  const { chainNamespace } = fromChainId(asset.chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Cosmos:
      return adapter.getFeeData({})
    case CHAIN_NAMESPACE.Ethereum:
      return (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: address,
        value,
        chainSpecific: {
          from: account,
          contractAddress,
        },
        sendMax,
      })
    case CHAIN_NAMESPACE.Bitcoin: {
      return (adapter as unknown as UtxoBaseAdapter<UtxoChainId>).getFeeData({
        to: address,
        value,
        chainSpecific: { pubkey: account },
        sendMax,
      })
    }
    default:
      throw new Error(`${chainNamespace} not supported`)
  }
}
