import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { useMemo } from 'react'
import { useKeepKeyVersions } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyVersions'
import { useWallet } from 'hooks/useWallet/useWallet'

export const useIsWalletConnectToDappsSupportedWallet = () => {
  const {
    state: { wallet, isDemoWallet },
  } = useWallet()
  const { isEIP712SupportedFirmwareVersion } = useKeepKeyVersions()

  return useMemo((): boolean => {
    if (!wallet) return false
    if (isDemoWallet) return false
    switch (true) {
      case wallet instanceof NativeHDWallet:
        return true
      case wallet instanceof KeepKeyHDWallet: {
        return isEIP712SupportedFirmwareVersion
      }
      default:
        return false
    }
  }, [wallet, isEIP712SupportedFirmwareVersion, isDemoWallet])
}
