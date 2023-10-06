import { type ChainReference, fromChainId } from '@shapeshiftoss/caip'
import { type EvmChainId, evmChainIds } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { HttpTransport, PublicClient } from 'viem'
import { createPublicClient, http } from 'viem'
import type { Chain } from 'viem/chains'
import { mainnet } from 'viem/chains'

import { rpcUrlByChainId } from './ethersProviderSingleton'

const viemClientsByChain = evmChainIds.reduce<
  Record<EvmChainId, PublicClient<HttpTransport, Chain>>
>(
  (acc, chainId) => {
    const nodeUrl = rpcUrlByChainId(chainId)
    acc[chainId] = createPublicClient({
      chain: mainnet,
      transport: http(nodeUrl),
    })

    return acc
  },
  {} as Record<EvmChainId, PublicClient<HttpTransport, Chain>>,
)

export const viemEthMainnetClient = viemClientsByChain[KnownChainIds.EthereumMainnet]

const viemChainToChainId = (chain: ChainReference | undefined): EvmChainId => {
  switch (chain) {
    case fromChainId(KnownChainIds.AvalancheMainnet).chainReference:
      return KnownChainIds.AvalancheMainnet
    case fromChainId(KnownChainIds.OptimismMainnet).chainReference:
      return KnownChainIds.OptimismMainnet
    case fromChainId(KnownChainIds.BnbSmartChainMainnet).chainReference:
      return KnownChainIds.BnbSmartChainMainnet
    case fromChainId(KnownChainIds.PolygonMainnet).chainReference:
      return KnownChainIds.PolygonMainnet
    case fromChainId(KnownChainIds.GnosisMainnet).chainReference:
      return KnownChainIds.GnosisMainnet
    case fromChainId(KnownChainIds.EthereumMainnet).chainReference:
    default:
      return KnownChainIds.EthereumMainnet
  }
}

export const getViemClientByChain = ({ chainId }: { chainId?: number }) => {
  const chainReference: ChainReference | undefined =
    chainId !== undefined ? (String(chainId) as ChainReference) : undefined
  return viemClientsByChain[viemChainToChainId(chainReference)]
}
