import type { ChainId } from '@shapeshiftoss/caip'
import {
  avalancheChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  gnosisChainId,
  ltcChainId,
  optimismChainId,
  osmosisChainId,
  polygonChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  supportsAvalanche,
  supportsBSC,
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsGnosis,
  supportsOptimism,
  supportsOsmosis,
  supportsPolygon,
  supportsThorchain,
} from '@shapeshiftoss/hdwallet-core'

type UseWalletSupportsChainArgs = { chainId: ChainId; wallet: HDWallet | null }
type UseWalletSupportsChain = (args: UseWalletSupportsChainArgs) => boolean

// use outside react
export const walletSupportsChain: UseWalletSupportsChain = ({ chainId, wallet }) => {
  if (!wallet) return false
  switch (chainId) {
    case btcChainId:
    case bchChainId:
    case dogeChainId:
    case ltcChainId:
      return supportsBTC(wallet)
    case ethChainId:
      return supportsETH(wallet)
    case avalancheChainId:
      return supportsAvalanche(wallet)
    case optimismChainId:
      return supportsOptimism(wallet)
    case bscChainId:
      return supportsBSC(wallet)
    case polygonChainId:
      return supportsPolygon(wallet)
    case gnosisChainId:
      return supportsGnosis(wallet)
    case cosmosChainId:
      return supportsCosmos(wallet)
    case osmosisChainId:
      return supportsOsmosis(wallet)
    case thorchainChainId:
      return supportsThorchain(wallet)
    default: {
      return false
    }
  }
}

// TODO(0xdef1cafe): this whole thing should belong in chain adapters
export const useWalletSupportsChain: UseWalletSupportsChain = args => walletSupportsChain(args)
