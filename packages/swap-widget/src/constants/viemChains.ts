import type { Chain, WalletClient } from 'viem'
import { arbitrum, avalanche, base, bsc, gnosis, mainnet, optimism, polygon } from 'viem/chains'

export const VIEM_CHAINS_BY_ID: Record<number, Chain> = {
  [mainnet.id]: {
    ...mainnet,
    rpcUrls: { default: { http: ['https://api.ethereum.shapeshift.com/api/v1/jsonrpc'] } },
  },
  [optimism.id]: {
    ...optimism,
    rpcUrls: { default: { http: ['https://api.optimism.shapeshift.com/api/v1/jsonrpc'] } },
  },
  [bsc.id]: {
    ...bsc,
    rpcUrls: { default: { http: ['https://api.bnbsmartchain.shapeshift.com/api/v1/jsonrpc'] } },
  },
  [gnosis.id]: {
    ...gnosis,
    rpcUrls: { default: { http: ['https://api.gnosis.shapeshift.com/api/v1/jsonrpc'] } },
  },
  [polygon.id]: {
    ...polygon,
    rpcUrls: { default: { http: ['https://api.polygon.shapeshift.com/api/v1/jsonrpc'] } },
  },
  [base.id]: {
    ...base,
    rpcUrls: { default: { http: ['https://api.base.shapeshift.com/api/v1/jsonrpc'] } },
  },
  [arbitrum.id]: {
    ...arbitrum,
    rpcUrls: { default: { http: ['https://api.arbitrum.shapeshift.com/api/v1/jsonrpc'] } },
  },
  [avalanche.id]: {
    ...avalanche,
    rpcUrls: { default: { http: ['https://api.avalanche.shapeshift.com/api/v1/jsonrpc'] } },
  },
}

export const addChainToWallet = async (client: WalletClient, chain: Chain): Promise<void> => {
  const { id, name, nativeCurrency, rpcUrls, blockExplorers } = chain

  await client.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: `0x${id.toString(16)}`,
        chainName: name,
        nativeCurrency,
        rpcUrls: rpcUrls.default.http,
        blockExplorerUrls: blockExplorers?.default ? [blockExplorers.default.url] : undefined,
      },
    ],
  })
}

export const switchOrAddChain = async (client: WalletClient, chainId: number): Promise<void> => {
  const chain = VIEM_CHAINS_BY_ID[chainId]

  try {
    await client.switchChain({ id: chainId })
  } catch (error) {
    const switchError = error as { code?: number; message?: string }
    const isChainNotAddedError =
      switchError.code === 4902 ||
      switchError.message?.toLowerCase().includes('unrecognized chain') ||
      switchError.message?.toLowerCase().includes('chain not added') ||
      switchError.message?.toLowerCase().includes('try adding the chain')

    if (isChainNotAddedError && chain) {
      await addChainToWallet(client, chain)
      await client.switchChain({ id: chainId })
    } else {
      throw error
    }
  }
}
