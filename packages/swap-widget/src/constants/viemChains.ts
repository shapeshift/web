import type { Chain, WalletClient } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  gnosis,
  hyperEvm,
  katana,
  mainnet,
  monad,
  optimism,
  plasma,
  polygon,
  worldchain,
} from 'viem/chains'

export const VIEM_CHAINS_BY_ID: Record<number, Chain> = {
  1: {
    ...mainnet,
    rpcUrls: { default: { http: ['https://api.ethereum.shapeshift.com/api/v1/jsonrpc'] } },
  },
  10: {
    ...optimism,
    rpcUrls: { default: { http: ['https://api.optimism.shapeshift.com/api/v1/jsonrpc'] } },
  },
  56: {
    ...bsc,
    rpcUrls: { default: { http: ['https://api.bnbsmartchain.shapeshift.com/api/v1/jsonrpc'] } },
  },
  100: {
    ...gnosis,
    rpcUrls: { default: { http: ['https://api.gnosis.shapeshift.com/api/v1/jsonrpc'] } },
  },
  137: {
    ...polygon,
    rpcUrls: { default: { http: ['https://api.polygon.shapeshift.com/api/v1/jsonrpc'] } },
  },
  143: { ...monad, rpcUrls: { default: { http: ['https://rpc.monad.xyz'] } } },
  480: {
    ...worldchain,
    rpcUrls: { default: { http: ['https://worldchain-mainnet.g.alchemy.com/public'] } },
  },
  999: { ...hyperEvm, rpcUrls: { default: { http: ['https://rpc.hyperliquid.xyz/evm'] } } },
  8453: {
    ...base,
    rpcUrls: { default: { http: ['https://api.base.shapeshift.com/api/v1/jsonrpc'] } },
  },
  9745: { ...plasma, rpcUrls: { default: { http: ['https://rpc.plasma.to'] } } },
  42161: {
    ...arbitrum,
    rpcUrls: { default: { http: ['https://api.arbitrum.shapeshift.com/api/v1/jsonrpc'] } },
  },
  43114: {
    ...avalanche,
    rpcUrls: { default: { http: ['https://api.avalanche.shapeshift.com/api/v1/jsonrpc'] } },
  },
  747474: { ...katana, rpcUrls: { default: { http: ['https://rpc.katana.network'] } } },
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
