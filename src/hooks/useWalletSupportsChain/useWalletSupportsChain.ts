import {
  avalancheChainId,
  btcChainId,
  ChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  ltcChainId,
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
    case btcChainId:
    case dogeChainId:
    case ltcChainId:
      return supportsBTC(wallet)
    case ethChainId:
      return supportsETH(wallet)
    case avalancheChainId:
      return supportsEthSwitchChain(wallet)
    case cosmosChainId:
      return supportsCosmos(wallet)
    case osmosisChainId:
      return supportsOsmosis(wallet)
    default: {
      console.error(`useWalletSupportsChain: unknown chain id ${chainId}`)
      return false
    }
  }
}

// TODO(0xdef1cafe): this whole thing should belong in chain adapters
export const useWalletSupportsChain: UseWalletSupportsChain = args => walletSupportsChain(args)
