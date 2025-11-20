import { useMemo } from 'react'

import { useKeepKeyVersions } from '@/context/WalletProvider/KeepKey/hooks/useKeepKeyVersions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isGridPlusHDWallet, isKeepKeyHDWallet, isNativeHDWallet, isTrezorHDWallet } from '@/lib/utils'

export const useIsWalletConnectToDappsSupportedWallet = () => {
  const {
    state: { wallet },
  } = useWallet()
  const { versionsQuery } = useKeepKeyVersions({ wallet })
  const isEIP712SupportedFirmwareVersion =
    versionsQuery.data?.isEIP712SupportedFirmwareVersion ?? false

  const result = useMemo((): boolean => {
    if (!wallet) return false
    switch (true) {
      case isNativeHDWallet(wallet):
      case isGridPlusHDWallet(wallet):
        return true
      case isKeepKeyHDWallet(wallet): {
        return isEIP712SupportedFirmwareVersion
      }
      case isTrezorHDWallet(wallet):
        return true
      default:
        return false
    }
  }, [wallet, isEIP712SupportedFirmwareVersion])

  return result
}
