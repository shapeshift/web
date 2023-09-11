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
  supportsPolygon,
  supportsThorchain,
} from '@shapeshiftoss/hdwallet-core'
import { MetaMaskShapeShiftMultiChainHDWallet } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'

type UseWalletSupportsChainArgs = {
  isSnapInstalled: boolean | null
  chainId: ChainId
  wallet: HDWallet | null
}
type UseWalletSupportsChain = (args: UseWalletSupportsChainArgs) => boolean | null

// use outside react
export const walletSupportsChain: UseWalletSupportsChain = ({
  chainId,
  wallet,
  isSnapInstalled,
}) => {
  if (!wallet) return false
  const isMetaMaskMultichainWallet = wallet instanceof MetaMaskShapeShiftMultiChainHDWallet
  // Naming is slightly weird there, but the intent is if this evaluates to false, it acts as a short circuit
  const shortCircuitFeatureDetection =
    !isMetaMaskMultichainWallet || (isMetaMaskMultichainWallet && isSnapInstalled)
  switch (chainId) {
    case btcChainId:
    case bchChainId:
    case dogeChainId:
    case ltcChainId:
      return supportsBTC(wallet) && shortCircuitFeatureDetection
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
      return supportsCosmos(wallet) && shortCircuitFeatureDetection
    case thorchainChainId:
      return supportsThorchain(wallet) && shortCircuitFeatureDetection
    default: {
      return false
    }
  }
}

export const useWalletSupportsChain: UseWalletSupportsChain = args => {
  // We might be in a state where the wallet adapter is MetaMaskShapeShiftMultiChainHDWallet, but the actual underlying wallet
  // doesn't have multichain capabilities since snaps isn't installed
  // This should obviously belong at hdwallet-core, and feature detection should be made async, with hdwallet-shapeshift-multichain able to do feature detection
  // programatically depending on whether the snaps is installed or not, but in the meantime, this will make things happy
  // If this evaluates to false, the wallet feature detection will be short circuit in supportsBTC, supportsCosmos and supports Thorchain methods
  const isSnapInstalled = useIsSnapInstalled()

  return walletSupportsChain({ ...args, isSnapInstalled })
}
