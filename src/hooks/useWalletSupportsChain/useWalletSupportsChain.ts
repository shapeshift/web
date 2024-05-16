import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
  avalancheChainId,
  baseChainId,
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
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  supportsArbitrum,
  supportsArbitrumNova,
  supportsAvalanche,
  //supportsBase,
  supportsBSC,
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsGnosis,
  supportsOptimism,
  supportsPolygon,
  supportsThorchain,
} from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { isMetaMask } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import { useMemo } from 'react'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { selectAccountIdsByChainIdFilter } from 'state/slices/portfolioSlice/selectors'
import { selectFeatureFlag } from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

type WalletSupportsChainArgs = {
  isSnapInstalled: boolean | null
  chainAccountIds: AccountId[] // allows dynamic chain-support detection for Ledger
  chainId: ChainId
  wallet: HDWallet | null
}

// use outside react
export const walletSupportsChain = ({
  chainId,
  chainAccountIds,
  wallet,
  isSnapInstalled,
}: WalletSupportsChainArgs): boolean | null => {
  if (!wallet) return false
  // A wallet may have feature-capabilities for a chain, but not have runtime support for it
  // e.g MM without snaps installed, or Ledger without chain account ids (meaning the user didn't connect said chain's accounts)
  const hasRuntimeSupport = (() => {
    if (Boolean(isLedger(wallet) && !chainAccountIds.length)) return false
    // Non-EVM ChainIds are only supported with the MM multichain snap installed
    if (isMetaMask(wallet) && !isSnapInstalled && !isEvmChainId(chainId)) return false

    // We are now sure we have runtime support for the chain.
    // This is either a Ledger with supported chain account ids, a MM wallet with snaps installed, or
    // any other wallet, which supports static wallet feature-detection
    return true
  })()

  // We have no runtime support for the current ChainId - trying and checking for feature-capabilities flags is futile
  if (!hasRuntimeSupport) return false

  const isArbitrumNovaEnabled = selectFeatureFlag(store.getState(), 'ArbitrumNova')

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
    case arbitrumChainId:
      return supportsArbitrum(wallet)
    case arbitrumNovaChainId:
      return isArbitrumNovaEnabled && supportsArbitrumNova(wallet)
    case baseChainId:
      //return supportsBase(wallet)
      return true
    case cosmosChainId:
      return supportsCosmos(wallet)
    case thorchainChainId:
      return supportsThorchain(wallet)
    default: {
      return false
    }
  }
}

export const useWalletSupportsChain = (
  chainId: ChainId,
  wallet: HDWallet | null,
): boolean | null => {
  // We might be in a state where the wallet adapter is MetaMaskShapeShiftMultiChainHDWallet, but the actual underlying wallet
  // doesn't have multichain capabilities since snaps isn't installed
  // This should obviously belong at hdwallet-core, and feature detection should be made async, with hdwallet-shapeshift-multichain able to do feature detection
  // programatically depending on whether the snaps is installed or not, but in the meantime, this will make things happy
  // If this evaluates to false, the wallet feature detection will be short circuit in supportsBTC, supportsCosmos and supports Thorchain methods
  const isSnapInstalled = useIsSnapInstalled()

  const chainAccountIdsFilter = useMemo(() => ({ chainId }), [chainId])
  const chainAccountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, chainAccountIdsFilter),
  )

  const result = useMemo(() => {
    return walletSupportsChain({ isSnapInstalled, chainId, wallet, chainAccountIds })
  }, [chainAccountIds, chainId, isSnapInstalled, wallet])

  return result
}
