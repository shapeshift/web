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
  hyperEvmChainId,
  ltcChainId,
  mayachainChainId,
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  solanaChainId,
  suiChainId,
  thorchainChainId,
  tronChainId,
  zecChainId,
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
  supportsHyperEvm,
  supportsMayachain,
  supportsMonad,
  supportsOptimism,
  supportsPlasma,
  supportsPolygon,
  supportsSolana,
  supportsSui,
  supportsThorchain,
  supportsTron,
} from '@shapeshiftoss/hdwallet-core'
import { GridPlusHDWallet } from '@shapeshiftoss/hdwallet-gridplus'
import { isMetaMask } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { isPhantom, PhantomHDWallet } from '@shapeshiftoss/hdwallet-phantom'
import { VultisigHDWallet } from '@shapeshiftoss/hdwallet-vultisig'
import { useMemo } from 'react'

import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { METAMASK_RDNS } from '@/lib/mipd'
import { isLedgerHDWallet, isNativeHDWallet, isTrezorHDWallet } from '@/lib/utils'
import { selectAccountIdsByChainIdFilter } from '@/state/slices/portfolioSlice/selectors'
import { selectFeatureFlag } from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

type CheckWalletHasRuntimeSupportArgs = {
  isSnapInstalled: boolean | null
  chainId: ChainId
  wallet: HDWallet | null
  connectedType?: KeyManager | null
}

const checkWalletHasRuntimeSupport = ({
  chainId,
  wallet,
  isSnapInstalled,
  connectedType,
}: CheckWalletHasRuntimeSupportArgs) => {
  if (!wallet && connectedType === KeyManager.Ledger) return true

  if (!wallet) return false

  // temp disable evm chains for phantom as it rate-limits Phantom. yet that's a thing.
  if (isEvmChainId(chainId) && isPhantom(wallet)) return false

  // Non-EVM ChainIds are only supported with the MM multichain snap installed
  if (
    isMetaMask(wallet) &&
    // snap installation checks may take a render or two too many to kick in after switching from MM with snaps to another mipd wallet
    // however, we get a new wallet ref instantly, so this ensures we don't wrongly derive non-EVM accounts for another EIP1193 wallet
    (!isSnapInstalled || wallet.providerRdns !== METAMASK_RDNS) &&
    !isEvmChainId(chainId)
  )
    return false

  // We are now sure we have runtime support for the chain.
  // This is either a Ledger with supported chain account ids, a MM wallet with snaps installed, or
  // any other wallet, which supports static wallet feature-detection
  return true
}

type WalletSupportsChainArgs = {
  isSnapInstalled: boolean | null
  chainId: ChainId
  wallet: HDWallet | null
  // The connected account ids to check against. If set to false, the currently connected account
  // ids will not be checked (used for initial boot)
  checkConnectedAccountIds: AccountId[] | false
  connectedType?: KeyManager | null
}

// use outside react
export const walletSupportsChain = ({
  chainId,
  wallet,
  isSnapInstalled,
  checkConnectedAccountIds,
  connectedType,
}: WalletSupportsChainArgs): boolean => {
  // If the user has no connected chain account ids, the user can't use it to interact with the chain
  if (checkConnectedAccountIds !== false && !checkConnectedAccountIds.length) {
    return false
  }

  // Handle Ledger read-only mode
  if (!wallet && connectedType === KeyManager.Ledger) {
    // For Ledger read-only, if we have account IDs for this chain, it means this Ledger supports it
    return checkConnectedAccountIds !== false && checkConnectedAccountIds.length > 0
  }

  if (!wallet) {
    return false
  }
  // A wallet may have feature-capabilities for a chain, but not have runtime support for it
  // e.g MM without snaps installed
  const hasRuntimeSupport = checkWalletHasRuntimeSupport({
    wallet,
    isSnapInstalled,
    chainId,
    connectedType,
  })

  // We have no runtime support for the current ChainId - trying and checking for feature-capabilities flags is futile
  if (!hasRuntimeSupport) return false

  const isArbitrumNovaEnabled = selectFeatureFlag(store.getState(), 'ArbitrumNova')
  const isHyperEvmEnabled = selectFeatureFlag(store.getState(), 'HyperEvm')
  const isMonadEnabled = selectFeatureFlag(store.getState(), 'Monad')
  const isPlasmaEnabled = selectFeatureFlag(store.getState(), 'Plasma')

  switch (chainId) {
    case btcChainId:
      // temp disable evm/BTC chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (wallet instanceof PhantomHDWallet) return false
      return supportsBTC(wallet)
    case bchChainId:
      // temp disable evm/BTC chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (wallet instanceof PhantomHDWallet) return false
      return (
        supportsBTC(wallet) &&
        !(wallet instanceof PhantomHDWallet) &&
        !(wallet instanceof GridPlusHDWallet)
      )
    case dogeChainId:
      // temp disable evm/BTC chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (wallet instanceof PhantomHDWallet) return false
      return (
        supportsBTC(wallet) &&
        !(wallet instanceof PhantomHDWallet) &&
        !(wallet instanceof GridPlusHDWallet)
      )
    case ltcChainId:
      // temp disable evm/BTC chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (wallet instanceof PhantomHDWallet) return false
      return (
        supportsBTC(wallet) &&
        !(wallet instanceof PhantomHDWallet) &&
        !(wallet instanceof GridPlusHDWallet)
      )
    case zecChainId:
      // temp disable evm/BTC chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (wallet instanceof PhantomHDWallet) return false
      return (
        supportsBTC(wallet) &&
        (isNativeHDWallet(wallet) || isLedgerHDWallet(wallet) || isTrezorHDWallet(wallet))
      )
    case ethChainId:
      // temp disable evm chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (isPhantom(wallet)) return false
      return supportsETH(wallet)
    case avalancheChainId:
      // temp disable evm chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (isPhantom(wallet)) return false
      return supportsAvalanche(wallet)
    case optimismChainId:
      // temp disable evm chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (isPhantom(wallet)) return false
      return supportsOptimism(wallet)
    case bscChainId:
      // temp disable evm chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (isPhantom(wallet)) return false
      return supportsBSC(wallet)
    case polygonChainId:
      // temp disable evm chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (isPhantom(wallet)) return false
      return supportsPolygon(wallet)
    case gnosisChainId:
      // temp disable evm chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (isPhantom(wallet)) return false
      return supportsGnosis(wallet)
    case arbitrumChainId:
      // temp disable evm chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (isPhantom(wallet)) return false
      return supportsArbitrum(wallet)
    case arbitrumNovaChainId:
      // temp disable evm chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (isPhantom(wallet)) return false
      return isArbitrumNovaEnabled && supportsArbitrumNova(wallet)
    case baseChainId:
      // temp disable evm chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (isPhantom(wallet)) return false
      return supportsBase(wallet)
    case monadChainId:
      // temp disable evm chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (isPhantom(wallet)) return false
      return isMonadEnabled && supportsMonad(wallet)
    case hyperEvmChainId:
      // temp disable evm chains for phantom as it rate-limits Phantom. yet that's a thing.
      if (isPhantom(wallet)) return false
      return isHyperEvmEnabled && supportsHyperEvm(wallet)
    case plasmaChainId:
      return isPlasmaEnabled && supportsPlasma(wallet)
    case cosmosChainId:
      return supportsCosmos(wallet)
    case thorchainChainId:
      return supportsThorchain(wallet)
    case mayachainChainId:
      return supportsMayachain(wallet)
    case solanaChainId:
      return supportsSolana(wallet) && !(wallet instanceof VultisigHDWallet)
    case tronChainId:
      return supportsTron(wallet)
    case suiChainId:
      return supportsSui(wallet)
    default: {
      return false
    }
  }
}

export const useWalletSupportsChain = (
  chainId: ChainId,
  wallet: HDWallet | null,
): boolean | null => {
  // MetaMaskMultiChainHDWallet is the reference EIP-1193 JavaScript provider implementation, but also includes snaps support hardcoded in feature capabilities
  // However we might be in a state where the wallet adapter is MetaMaskMultiChainHDWallet, but the actual underlying wallet
  // doesn't have multichain capabilities since snaps isn't installed/the connected wallet isn't *actual* MM
  const { isSnapInstalled } = useIsSnapInstalled()
  const { state } = useWallet()
  const connectedType = state.connectedType

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
      connectedType,
    })
  }, [chainAccountIds, chainId, isSnapInstalled, wallet, connectedType])

  return result
}

export const useWalletSupportsChainAtRuntime = (
  chainId: ChainId,
  wallet: HDWallet | null,
): boolean | null => {
  const { isSnapInstalled } = useIsSnapInstalled()
  const { state } = useWallet()
  const connectedType = state.connectedType

  const result = useMemo(() => {
    return checkWalletHasRuntimeSupport({
      isSnapInstalled,
      chainId,
      wallet,
      connectedType,
    })
  }, [chainId, isSnapInstalled, wallet, connectedType])

  return result
}
