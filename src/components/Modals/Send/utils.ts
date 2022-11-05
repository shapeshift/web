import type { Asset } from '@keepkey/asset-service'
import type { ChainId } from '@keepkey/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@keepkey/caip'
import type {
  EvmBaseAdapter,
  EvmChainId,
  FeeDataEstimate,
  UtxoBaseAdapter,
  UtxoChainId,
} from '@keepkey/chain-adapters'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

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
  const value = bnOrZero(cryptoAmount).times(bn(10).exponentiatedBy(asset.precision)).toFixed(0)

  const adapter = chainAdapterManager.get(asset.chainId)
  if (!adapter) throw new Error(`No adapter available for ${asset.chainId}`)

  const { chainNamespace } = fromChainId(asset.chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.CosmosSdk:
      return adapter.getFeeData({})
    case CHAIN_NAMESPACE.Evm:
      return (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: address,
        value,
        chainSpecific: {
          from: account,
          contractAddress,
        },
        sendMax,
      })
    case CHAIN_NAMESPACE.Utxo: {
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
