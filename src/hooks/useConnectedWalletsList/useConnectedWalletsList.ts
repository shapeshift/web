import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { RDNS_TO_FIRST_CLASS_KEYMANAGER } from '@/context/WalletProvider/NewWalletViews/constants'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useMipdProviders } from '@/lib/mipd'
import { reactQueries } from '@/react-queries'

export type ConnectedWallet = {
  id: string
  name: string
  icon: string | React.ComponentType
  walletType: 'native' | 'mipd' | 'hardware'
  isMipdProvider: boolean
  isCurrentWallet: boolean
  keyManager?: KeyManager
  deviceId?: string
}

export const useConnectedWalletsList = () => {
  const {
    state: { walletInfo, connectedType },
  } = useWallet()
  const mipdProviders = useMipdProviders()

  const nativeVaultsQuery = useQuery({
    ...reactQueries.common.hdwalletNativeVaultsList(),
    refetchOnMount: true,
  })

  const walletsList = useMemo((): ConnectedWallet[] => {
    const wallets: ConnectedWallet[] = []

    // Add native/ShapeShift wallets
    const nativeWallets = nativeVaultsQuery.data ?? []
    nativeWallets.forEach(vault => {
      wallets.push({
        id: vault.id,
        name: vault.name,
        icon: SUPPORTED_WALLETS[KeyManager.Native].icon,
        walletType: 'native',
        isMipdProvider: false,
        isCurrentWallet: connectedType === KeyManager.Native && walletInfo?.deviceId === vault.id,
        keyManager: KeyManager.Native,
        deviceId: vault.id,
      })
    })

    // Add MIPD providers (installed browser wallets)
    mipdProviders.forEach(provider => {
      const isFirstClass = provider.info.rdns in RDNS_TO_FIRST_CLASS_KEYMANAGER
      const keyManager = isFirstClass
        ? RDNS_TO_FIRST_CLASS_KEYMANAGER[provider.info.rdns]
        : KeyManager.MetaMask

      const isCurrentMipdWallet =
        walletInfo?.name === provider.info.name &&
        (connectedType === keyManager || connectedType === KeyManager.MetaMask)

      wallets.push({
        id: provider.info.rdns,
        name: provider.info.name,
        icon: provider.info.icon,
        walletType: 'mipd',
        isMipdProvider: true,
        isCurrentWallet: isCurrentMipdWallet,
        keyManager: isFirstClass ? keyManager : KeyManager.MetaMask,
      })
    })

    return wallets
  }, [nativeVaultsQuery.data, mipdProviders, walletInfo, connectedType])

  return {
    wallets: walletsList,
    isLoading: nativeVaultsQuery.isLoading,
  }
}
