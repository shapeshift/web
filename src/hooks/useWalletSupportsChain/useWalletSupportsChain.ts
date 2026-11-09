import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import {
  abstractChainId,
  aptosChainId,
  berachainChainId,
  blastChainId,
  bobChainId,
  celoChainId,
  cronosChainId,
  elysiumChainId,
  etherealChainId,
  flowEvmChainId,
  hemiChainId,
  hyperEvmChainId,
  inkChainId,
  katanaChainId,
  lineaChainId,
  mantleChainId,
  megaethChainId,
  modeChainId,
  monadChainId,
  nearChainId,
  plasmaChainId,
  plumeChainId,
  robinhoodChainId,
  scrollChainId,
  seiChainId,
  soneiumChainId,
  sonicChainId,
  starknetChainId,
  storyChainId,
  tonChainId,
  unichainChainId,
  worldChainChainId,
  zkSyncEraChainId,
} from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { isMetaMask } from '@shapeshiftoss/hdwallet-core/wallet'
import { isMetaMaskNativeMultichain } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { useMemo } from 'react'

import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { METAMASK_RDNS } from '@/lib/mipd'
import { selectAccountIdsByChainIdFilter } from '@/state/slices/portfolioSlice/selectors'
import { isChainSupportedByWallet } from '@/state/slices/portfolioSlice/utils'
import type { Flag } from '@/state/slices/preferencesSlice/preferencesSlice'
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

  // Non-EVM ChainIds are only supported with the MM multichain snap installed or native multichain
  if (
    isMetaMask(wallet) &&
    // Native multichain wallet supports non-EVM chains directly
    !isMetaMaskNativeMultichain(wallet) &&
    // snap installation checks may take a render or two too many to kick in after switching from MM with snaps to another mipd wallet
    // however, we get a new wallet ref instantly, so this ensures we don't wrongly derive non-EVM accounts for another EIP1193 wallet
    (!isSnapInstalled || (wallet as { providerRdns?: string }).providerRdns !== METAMASK_RDNS) &&
    !isEvmChainId(chainId)
  )
    return false

  // We are now sure we have runtime support for the chain.
  // This is either a Ledger with supported chain account ids, a MM wallet with snaps installed, or
  // any other wallet, which supports static wallet feature-detection
  return true
}

const featureFlagByChainId: Partial<Record<ChainId, Flag>> = {
  [monadChainId]: 'Monad',
  [hyperEvmChainId]: 'HyperEvm',
  [mantleChainId]: 'Mantle',
  [inkChainId]: 'Ink',
  [megaethChainId]: 'MegaEth',
  [berachainChainId]: 'Berachain',
  [plasmaChainId]: 'Plasma',
  [katanaChainId]: 'Katana',
  [etherealChainId]: 'Ethereal',
  [celoChainId]: 'Celo',
  [flowEvmChainId]: 'FlowEvm',
  [plumeChainId]: 'Plume',
  [storyChainId]: 'Story',
  [zkSyncEraChainId]: 'ZkSyncEra',
  [blastChainId]: 'Blast',
  [abstractChainId]: 'Abstract',
  [worldChainChainId]: 'WorldChain',
  [hemiChainId]: 'Hemi',
  [seiChainId]: 'Sei',
  [lineaChainId]: 'Linea',
  [scrollChainId]: 'Scroll',
  [cronosChainId]: 'Cronos',
  [sonicChainId]: 'Sonic',
  [unichainChainId]: 'Unichain',
  [bobChainId]: 'Bob',
  [modeChainId]: 'Mode',
  [soneiumChainId]: 'Soneium',
  [aptosChainId]: 'Aptos',
  [nearChainId]: 'Near',
  [starknetChainId]: 'Starknet',
  [tonChainId]: 'Ton',
  [robinhoodChainId]: 'Robinhood',
  [elysiumChainId]: 'Elysium',
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

  const featureFlag = featureFlagByChainId[chainId]
  if (featureFlag && !selectFeatureFlag(store.getState(), featureFlag)) return false

  return isChainSupportedByWallet(chainId, wallet)
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
