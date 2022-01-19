import { CAIP2, caip2 } from '@shapeshiftoss/caip'
import { HDWallet, supportsBTC, supportsETH } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

type UseWalletSupportsChainArgs = { chainId: CAIP2; wallet: HDWallet | null }
type UseWalletSupportsChain = (args: UseWalletSupportsChainArgs) => boolean

// use outside react
export const walletSupportChain: UseWalletSupportsChain = ({ chainId, wallet }) => {
  if (!wallet) return false
  const ethCAIP2 = caip2.toCAIP2({ chain: ChainTypes.Ethereum, network: NetworkTypes.MAINNET })
  const btcCAIP2 = caip2.toCAIP2({ chain: ChainTypes.Bitcoin, network: NetworkTypes.MAINNET })
  switch (chainId) {
    case ethCAIP2: {
      return supportsETH(wallet)
    }
    case btcCAIP2: {
      return supportsBTC(wallet)
    }
    default: {
      console.error(`useWalletSupportsChain: unknown chain id ${chainId}`)
      return false
    }
  }
}

// TODO(0xdef1cafe): this whole thing should belong in chain adapters
export const useWalletSupportsChain: UseWalletSupportsChain = args => walletSupportChain(args)
