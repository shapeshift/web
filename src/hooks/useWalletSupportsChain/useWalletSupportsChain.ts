import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bchChainId,
  berachainChainId,
  blastChainId,
  bobChainId,
  bscChainId,
  btcChainId,
  celoChainId,
  cosmosChainId,
  cronosChainId,
  dogeChainId,
  ethChainId,
  etherealChainId,
  flowEvmChainId,
  gnosisChainId,
  hemiChainId,
  hyperEvmChainId,
  inkChainId,
  katanaChainId,
  lineaChainId,
  ltcChainId,
  mantleChainId,
  mayachainChainId,
  megaethChainId,
  modeChainId,
  monadChainId,
  nearChainId,
  optimismChainId,
  plasmaChainId,
  plumeChainId,
  polygonChainId,
  scrollChainId,
  seiChainId,
  solanaChainId,
  soneiumChainId,
  sonicChainId,
  starknetChainId,
  storyChainId,
  suiChainId,
  thorchainChainId,
  tonChainId,
  tronChainId,
  unichainChainId,
  worldChainChainId,
  zecChainId,
  zkSyncEraChainId,
} from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  isGridPlus,
  isMetaMask,
  isPhantom,
  isVultisig,
  supportsArbitrum,
  supportsAvalanche,
  supportsBase,
  supportsBerachain,
  supportsBlast,
  supportsBob,
  supportsBSC,
  supportsBTC,
  supportsCelo,
  supportsCosmos,
  supportsCronos,
  supportsETH,
  supportsEthereal,
  supportsFlowEvm,
  supportsGnosis,
  supportsHemi,
  supportsHyperEvm,
  supportsInk,
  supportsKatana,
  supportsLinea,
  supportsMantle,
  supportsMayachain,
  supportsMegaEth,
  supportsMode,
  supportsMonad,
  supportsOptimism,
  supportsPlasma,
  supportsPlume,
  supportsPolygon,
  supportsScroll,
  supportsSei,
  supportsSolana,
  supportsSoneium,
  supportsSonic,
  supportsStarknet,
  supportsStory,
  supportsSui,
  supportsThorchain,
  supportsTron,
  supportsUnichain,
  supportsWorldChain,
  supportsZkSyncEra,
} from '@shapeshiftoss/hdwallet-core/wallet'
import { useMemo } from 'react'

import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { METAMASK_RDNS } from '@/lib/mipd'
import { isLedgerHDWallet, isNativeHDWallet, isTrezorHDWallet } from '@/lib/utils'
import { supportsNear } from '@/lib/utils/near'
import { supportsTon } from '@/lib/utils/ton'
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

  // Non-EVM ChainIds are only supported with the MM multichain snap installed
  if (
    isMetaMask(wallet) &&
    // snap installation checks may take a render or two too many to kick in after switching from MM with snaps to another mipd wallet
    // however, we get a new wallet ref instantly, so this ensures we don't wrongly derive non-EVM accounts for another EIP1193 wallet
    (!isSnapInstalled || (wallet as any).providerRdns !== METAMASK_RDNS) &&
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

  const isEtherealEnabled = selectFeatureFlag(store.getState(), 'Ethereal')
  const isFlowEvmEnabled = selectFeatureFlag(store.getState(), 'FlowEvm')
  const isZkSyncEraEnabled = selectFeatureFlag(store.getState(), 'ZkSyncEra')
  const isBlastEnabled = selectFeatureFlag(store.getState(), 'Blast')
  const isHemiEnabled = selectFeatureFlag(store.getState(), 'Hemi')
  const isHyperEvmEnabled = selectFeatureFlag(store.getState(), 'HyperEvm')
  const isInkEnabled = selectFeatureFlag(store.getState(), 'Ink')
  const isBobEnabled = selectFeatureFlag(store.getState(), 'Bob')
  const isKatanaEnabled = selectFeatureFlag(store.getState(), 'Katana')
  const isCeloEnabled = selectFeatureFlag(store.getState(), 'Celo')
  const isStoryEnabled = selectFeatureFlag(store.getState(), 'Story')
  const isMantleEnabled = selectFeatureFlag(store.getState(), 'Mantle')
  const isLineaEnabled = selectFeatureFlag(store.getState(), 'Linea')
  const isCronosEnabled = selectFeatureFlag(store.getState(), 'Cronos')
  const isSonicEnabled = selectFeatureFlag(store.getState(), 'Sonic')
  const isUnichainEnabled = selectFeatureFlag(store.getState(), 'Unichain')
  const isSoneiumEnabled = selectFeatureFlag(store.getState(), 'Soneium')
  const isMegaEthEnabled = selectFeatureFlag(store.getState(), 'MegaEth')
  const isBerachainEnabled = selectFeatureFlag(store.getState(), 'Berachain')
  const isModeEnabled = selectFeatureFlag(store.getState(), 'Mode')
  const isMonadEnabled = selectFeatureFlag(store.getState(), 'Monad')
  const isNearEnabled = selectFeatureFlag(store.getState(), 'Near')
  const isPlasmaEnabled = selectFeatureFlag(store.getState(), 'Plasma')
  const isPlumeEnabled = selectFeatureFlag(store.getState(), 'Plume')
  const isSeiEnabled = selectFeatureFlag(store.getState(), 'Sei')
  const isScrollEnabled = selectFeatureFlag(store.getState(), 'Scroll')
  const isStarknetEnabled = selectFeatureFlag(store.getState(), 'Starknet')
  const isWorldChainEnabled = selectFeatureFlag(store.getState(), 'WorldChain')
  const isTonEnabled = selectFeatureFlag(store.getState(), 'Ton')

  switch (chainId) {
    case btcChainId:
      return supportsBTC(wallet)
    case bchChainId:
      return supportsBTC(wallet) && !isPhantom(wallet) && !isGridPlus(wallet)
    case dogeChainId:
      return supportsBTC(wallet) && !isPhantom(wallet) && !isGridPlus(wallet)
    case ltcChainId:
      return supportsBTC(wallet) && !isPhantom(wallet) && !isGridPlus(wallet)
    case zecChainId:
      return (
        supportsBTC(wallet) &&
        (isNativeHDWallet(wallet) || isLedgerHDWallet(wallet) || isTrezorHDWallet(wallet))
      )
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
    case baseChainId:
      return supportsBase(wallet)
    case monadChainId:
      return isMonadEnabled && supportsMonad(wallet)
    case hyperEvmChainId:
      return isHyperEvmEnabled && supportsHyperEvm(wallet)
    case mantleChainId:
      return isMantleEnabled && supportsMantle(wallet)
    case inkChainId:
      return isInkEnabled && supportsInk(wallet)
    case megaethChainId:
      return isMegaEthEnabled && supportsMegaEth(wallet)
    case berachainChainId:
      return isBerachainEnabled && supportsBerachain(wallet)
    case plasmaChainId:
      return isPlasmaEnabled && supportsPlasma(wallet)
    case katanaChainId:
      return isKatanaEnabled && supportsKatana(wallet)
    case etherealChainId:
      return isEtherealEnabled && supportsEthereal(wallet)
    case celoChainId:
      return isCeloEnabled && supportsCelo(wallet)
    case flowEvmChainId:
      return isFlowEvmEnabled && supportsFlowEvm(wallet)
    case plumeChainId:
      return isPlumeEnabled && supportsPlume(wallet)
    case storyChainId:
      return isStoryEnabled && supportsStory(wallet)
    case zkSyncEraChainId:
      return isZkSyncEraEnabled && supportsZkSyncEra(wallet)
    case blastChainId:
      return isBlastEnabled && supportsBlast(wallet)
    case worldChainChainId:
      return isWorldChainEnabled && supportsWorldChain(wallet)
    case hemiChainId:
      return isHemiEnabled && supportsHemi(wallet)
    case seiChainId:
      return isSeiEnabled && supportsSei(wallet)
    case lineaChainId:
      return isLineaEnabled && supportsLinea(wallet)
    case scrollChainId:
      return isScrollEnabled && supportsScroll(wallet)
    case cronosChainId:
      return isCronosEnabled && supportsCronos(wallet)
    case sonicChainId:
      return isSonicEnabled && supportsSonic(wallet)
    case unichainChainId:
      return isUnichainEnabled && supportsUnichain(wallet)
    case bobChainId:
      return isBobEnabled && supportsBob(wallet)
    case modeChainId:
      return isModeEnabled && supportsMode(wallet)
    case soneiumChainId:
      return isSoneiumEnabled && supportsSoneium(wallet)
    case cosmosChainId:
      return supportsCosmos(wallet)
    case thorchainChainId:
      return supportsThorchain(wallet)
    case mayachainChainId:
      return supportsMayachain(wallet)
    case solanaChainId:
      return supportsSolana(wallet) && !isVultisig(wallet)
    case tronChainId:
      return supportsTron(wallet)
    case suiChainId:
      return supportsSui(wallet)
    case nearChainId:
      return isNearEnabled && supportsNear(wallet)
    case starknetChainId:
      return isStarknetEnabled && supportsStarknet(wallet)
    case tonChainId:
      return isTonEnabled && supportsTon(wallet)
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
