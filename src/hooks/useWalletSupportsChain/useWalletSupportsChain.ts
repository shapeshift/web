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
  supportsBase,
  supportsBSC,
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsGnosis,
  supportsOptimism,
  supportsPolygon,
  supportsThorchain,
} from '@shapeshiftoss/hdwallet-core'
import { isMetaMask } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { PhantomHDWallet } from '@shapeshiftoss/hdwallet-phantom'
import { useMemo } from 'react'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { selectAccountIdsByChainIdFilter } from 'state/slices/portfolioSlice/selectors'
import { selectFeatureFlag } from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

type WalletSupportsChainArgs = {
  isSnapInstalled: boolean | null
  chainId: ChainId
  wallet: HDWallet | null
  // The connected account ids to check against. If set to false, the currently connected account
  // ids will not be checked (used for initial boot)
  checkConnectedAccountIds: AccountId[] | false
}

// use outside react
export const walletSupportsChain = ({
  chainId,
  wallet,
  isSnapInstalled,
  checkConnectedAccountIds,
}: WalletSupportsChainArgs): boolean => {
  // If the user has no connected chain account ids, the user can't use it to interact with the chain
  if (checkConnectedAccountIds !== false && !checkConnectedAccountIds.length) return false

  if (!wallet) return false
  // A wallet may have feature-capabilities for a chain, but not have runtime support for it
  // e.g MM without snaps installed
  const hasRuntimeSupport = (() => {
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
      return supportsBTC(wallet)
    case bchChainId:
      return supportsBTC(wallet) && !(wallet instanceof PhantomHDWallet)
    case dogeChainId:
      return supportsBTC(wallet) && !(wallet instanceof PhantomHDWallet)
    case ltcChainId:
      return supportsBTC(wallet) && !(wallet instanceof PhantomHDWallet)
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
      return supportsBase(wallet)
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
  // This should obviously belong at hdwallet-core, and feature detection should be made async, with hdwallet-metamask-multichain able to do feature detection
  // programatically depending on whether the snaps is installed or not, but in the meantime, this will make things happy
  // If this evaluates to false, the wallet feature detection will be short circuit in supportsBTC, supportsCosmos and supports Thorchain methods
  const { isSnapInstalled } = useIsSnapInstalled()

  const chainAccountIdsFilter = useMemo(() => ({ chainId }), [chainId])
  const chainAccountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, chainAccountIdsFilter),
  )

  const result = useMemo(() => {
    return walletSupportsChain({
      isSnapInstalled,
      chainId,
      wallet,
      checkConnectedAccountIds: chainAccountIds,
    })
  }, [chainAccountIds, chainId, isSnapInstalled, wallet])

  return result
}
