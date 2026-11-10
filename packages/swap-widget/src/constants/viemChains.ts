import type { Chain, WalletClient } from 'viem'
import { defineChain } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  gnosis,
  hyperEvm,
  katana,
  mainnet,
  megaeth,
  monad,
  optimism,
  plasma,
  polygon,
} from 'viem/chains'

// Plain object (not a viem Chain) so config/appkit.ts can reuse it across AppKit's viem copy
export const ELYSIUM_CHAIN_DEFINITION = {
  id: 99901,
  name: 'Elysium',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.elysium.kinetiq.xyz'] } },
  blockExplorers: {
    default: { name: 'Elysium Explorer', url: 'https://elysium.kinetiq.xyz' },
  },
  contracts: {
    multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' },
  },
} as const

const elysium = defineChain(ELYSIUM_CHAIN_DEFINITION)

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
  [monad.id]: { ...monad, rpcUrls: { default: { http: ['https://rpc.monad.xyz'] } } },
  [megaeth.id]: megaeth,
  [hyperEvm.id]: {
    ...hyperEvm,
    rpcUrls: { default: { http: ['https://rpc.hyperliquid.xyz/evm'] } },
  },
  [plasma.id]: { ...plasma, rpcUrls: { default: { http: ['https://rpc.plasma.to'] } } },
  [katana.id]: { ...katana, rpcUrls: { default: { http: ['https://rpc.katana.network'] } } },
  [elysium.id]: elysium,
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
