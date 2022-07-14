import {
  avalancheChainId,
  btcChainId,
  ChainId,
  cosmosChainId,
  ethChainId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import {
  HDWallet,
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsEthSwitchChain,
  supportsOsmosis,
} from '@shapeshiftoss/hdwallet-core'

type UseWalletSupportsChainArgs = { chainId: ChainId; wallet: HDWallet | null }
type UseWalletSupportsChain = (args: UseWalletSupportsChainArgs) => boolean

// use outside react
export const walletSupportsChain: UseWalletSupportsChain = ({ chainId, wallet }) => {
  if (!wallet) return false
  switch (chainId) {
    case ethChainId: {
      return supportsETH(wallet)
    }
    case btcChainId: {
      return supportsBTC(wallet)
    }
    case cosmosChainId: {
      return supportsCosmos(wallet)
    }
    case osmosisChainId: {
      return supportsOsmosis(wallet)
    }
    case avalancheChainId: {
      return supportsEthSwitchChain(wallet)
    }
    default: {
      console.error(`useWalletSupportsChain: unknown chain id ${chainId}`)
      return false
    }
  }
}

// TODO(0xdef1cafe): this whole thing should belong in chain adapters
export const useWalletSupportsChain: UseWalletSupportsChain = args => walletSupportsChain(args)
