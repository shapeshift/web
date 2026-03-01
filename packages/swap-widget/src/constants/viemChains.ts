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
} from 'viem/chains'

export const VIEM_CHAINS_BY_ID: Record<number, Chain> = {
  1: mainnet,
  10: optimism,
  56: bsc,
  100: gnosis,
  137: polygon,
  143: monad,
  999: hyperEvm,
  8453: base,
  9745: plasma,
  42161: arbitrum,
  43114: avalanche,
  747474: katana,
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
