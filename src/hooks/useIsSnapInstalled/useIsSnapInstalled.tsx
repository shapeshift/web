import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { isMetaMask } from '@shapeshiftoss/hdwallet-core/wallet'
import { isMetaMaskNativeMultichain } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { useQuery } from '@tanstack/react-query'
import pDebounce from 'p-debounce'
import { useCallback } from 'react'

import { getConfig } from '@/config'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { METAMASK_RDNS } from '@/lib/mipd'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'
import { getSnapVersion } from '@/utils/snaps'

const POLL_INTERVAL = 3000 // tune me to make this "feel" right
const snapVersion = getConfig().VITE_SNAP_VERSION

// Many many user-agents to detect mobile MM and other in-app dApp browsers
// https://github.com/MetaMask/metamask-mobile/issues/3920#issuecomment-1074188335
const isBrowser = () => typeof window !== 'undefined'
// Is a browser and has MetaMaskMobile user-agent
export const checkIsMetaMaskMobileWebView = () =>
  isBrowser() && /(MetaMaskMobile)/i.test(window.navigator.userAgent ?? '')

export const checkIsSnapInstalled = pDebounce.promise(
  (): Promise<boolean | null> => getSnapVersion().then(Boolean),
)

export const checkIsMetaMaskDesktop = (wallet: HDWallet | null): boolean => {
  const isMetaMaskMultichainWallet = isMetaMask(wallet)
  // We don't want to run this hook altogether if using any wallet other than MM
  if (!isMetaMaskMultichainWallet) return false
  if ((wallet as any).providerRdns !== METAMASK_RDNS) return false
  const isMetaMaskMobileWebView = checkIsMetaMaskMobileWebView()
  if (isMetaMaskMobileWebView) return false

  return true
}

export const useIsSnapInstalled = (): {
  isSnapInstalled: boolean | null
  isCorrectVersion: boolean | null
} => {
  const isMmNativeMultichain = useFeatureFlag('MmNativeMultichain')

  const {
    state: { wallet, isConnected },
  } = useWallet()

  const connectedRdns = useAppSelector(selectWalletRdns)

  const checkSnapInstallation = useCallback(async () => {
    if (isMmNativeMultichain)
      return {
        isCorrectVersion: null,
        isSnapInstalled: null,
      }

    if (connectedRdns !== METAMASK_RDNS || !isConnected)
      return {
        isCorrectVersion: null,
        isSnapInstalled: null,
      }

    const isMetaMaskDesktop = checkIsMetaMaskDesktop(wallet)
    if (!isMetaMaskDesktop)
      return {
        isCorrectVersion: null,
        isSnapInstalled: null,
      }

    const version = await getSnapVersion()
    const _isSnapInstalled = await checkIsSnapInstalled()

    return {
      isCorrectVersion: version === snapVersion,
      isSnapInstalled: _isSnapInstalled,
    }
  }, [isMmNativeMultichain, connectedRdns, isConnected, wallet])

  const { data: snapInstallation = { isCorrectVersion: null, isSnapInstalled: null } } = useQuery({
    queryKey: ['snapInstallation', connectedRdns, isConnected, isMmNativeMultichain],
    queryFn: checkSnapInstallation,
    refetchInterval: isMmNativeMultichain ? false : POLL_INTERVAL,
    staleTime: 0,
    gcTime: 0,
  })

  return snapInstallation
}

export const canAddMetaMaskAccount = ({
  accountNumber,
  chainId,
  wallet,
  isSnapInstalled,
}: {
  accountNumber: number
  chainId: ChainId
  wallet: HDWallet
  isSnapInstalled: boolean
}) => {
  const isMetaMaskMultichainHdWallet = isMetaMask(wallet)

  if (!isMetaMaskMultichainHdWallet)
    throw new Error(
      'canAddMetaMaskAccount should only be called in the context of a MetaMask adapter',
    )

  // Can always add 0th account regardless of chain/snap installation
  if (accountNumber === 0) return true

  // Native multichain: multi-account for BTC/SOL via Wallet Standard, not for EVM
  if (isMetaMaskNativeMultichain(wallet)) {
    // EVM multi-account still not supported in native mode - MM returns the same address for all EVM account indices
    if (isEvmChainId(chainId)) return false
    // For BTC/SOL, we support multiple accounts via Wallet Standard
    // The actual account count depends on what MM exposes
    return true
  }

  // MM without snaps never support multi-account, regardless of chain
  if (!isSnapInstalled) return false

  // MM doesn't support multi-account for EVM chains, regardless of snap installation
  // since EVM chains in MM use MetaMask's native JSON-RPC functionality which doesn't support multi-account
  // Trying to derive an account 0+ will always return the 0th account
  if (isEvmChainId(chainId)) return false

  if (
    // Cosmos SDK chains account derivation > 0 is rugged for snaps and always return the 0th account, similar to the rug for EVM chains above
    fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk
  )
    return false

  // This is a non-Cosmos SDK, non-EVM account 0+ with snaps installed, we can add this account
  return true
}
