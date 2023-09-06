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
import { shapeShiftSnapInstalled } from '@shapeshiftoss/metamask-snaps-adapter'
import { getConfig } from 'config'
import { useEffect, useState } from 'react'

type UseWalletSupportsChainArgs = { chainId: ChainId; wallet: HDWallet | null }
type UseWalletSupportsChain = (args: UseWalletSupportsChainArgs) => boolean | null
type UseWalletSupportsChainAsync = (args: UseWalletSupportsChainArgs) => Promise<boolean>

// use outside react
export const walletSupportsChain: UseWalletSupportsChainAsync = async ({ chainId, wallet }) => {
  if (!wallet) return false
  const isMetaMaskMultichainWallet = wallet instanceof MetaMaskShapeShiftMultiChainHDWallet
  // We might be in a state where the wallet adapter is MetaMaskShapeShiftMultiChainHDWallet, but the actual underlying either
  // - doesn't support snaps (as snaps are currently only in Flask canary build at the time of writing) or
  // - supports snaps, but the snaps isn't installed
  // This should obviously belong at hdwallet-core, and feature detection should be made async, with hdwallet-shapeshift-multichain able to do feature detection
  // programatically depending on whether the snaps is installed or not, but in the meantime, this will make things happy
  const snapId = getConfig().REACT_APP_SNAP_ID
  const isSnapInstalled = await shapeShiftSnapInstalled(snapId)
  // If this evaluates to false, the wallet feature detection will be short circuit
  const skipWalletFeatureDetection =
    !isMetaMaskMultichainWallet || (isMetaMaskMultichainWallet && isSnapInstalled)
  switch (chainId) {
    case btcChainId:
    case bchChainId:
    case dogeChainId:
    case ltcChainId:
      return supportsBTC(wallet) && skipWalletFeatureDetection
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
      return supportsCosmos(wallet) && skipWalletFeatureDetection
    case thorchainChainId:
      return supportsThorchain(wallet) && skipWalletFeatureDetection
    default: {
      return false
    }
  }
}

export const useWalletSupportsChain: UseWalletSupportsChain = args => {
  const [supported, setSupported] = useState<boolean | null>(null)

  useEffect(() => {
    ;(async () => {
      const result = await walletSupportsChain(args)
      setSupported(result)
    })()
  }, [args])

  return supported
}
