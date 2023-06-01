import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { CosmosSdkChainId, EvmChainId, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { TradeBase } from 'lib/swapper/api'

export const isUtxoChainId = (chainId: ChainId): chainId is UtxoChainId => {
  const { chainNamespace } = fromChainId(chainId)
  return chainNamespace === CHAIN_NAMESPACE.Utxo
}

export const isEvmChainId = (chainId: ChainId): chainId is EvmChainId => {
  const { chainNamespace } = fromChainId(chainId)
  return chainNamespace === CHAIN_NAMESPACE.Evm
}

export const isCosmosSdkChainId = (chainId: ChainId): chainId is CosmosSdkChainId => {
  const { chainNamespace } = fromChainId(chainId)
  return chainNamespace === CHAIN_NAMESPACE.CosmosSdk
}

export const isEvmTrade = (trade: TradeBase<ChainId>): trade is TradeBase<EvmChainId> => {
  return isEvmChainId(trade.sellAsset.chainId)
}

export const isCosmosSdkTrade = (
  trade: TradeBase<ChainId>,
): trade is TradeBase<CosmosSdkChainId> => {
  return isCosmosSdkChainId(trade.sellAsset.chainId)
}

export const isUtxoTrade = (trade: TradeBase<ChainId>): trade is TradeBase<UtxoChainId> => {
  return isUtxoChainId(trade.sellAsset.chainId)
}
