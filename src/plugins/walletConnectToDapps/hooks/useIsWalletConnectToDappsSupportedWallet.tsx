import { useMemo } from 'react'
import { useKeepKeyVersions } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyVersions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isKeepKeyHDWallet, isNativeHDWallet } from 'lib/utils'

export const useIsWalletConnectToDappsSupportedWallet = () => {
  const {
    state: { wallet, isDemoWallet },
  } = useWallet()
  const { isEIP712SupportedFirmwareVersion } = useKeepKeyVersions()

  const result = useMemo((): boolean => {
    if (!wallet) return false
    if (isDemoWallet) return false
    switch (true) {
      case isNativeHDWallet(wallet):
        return true
      case isKeepKeyHDWallet(wallet): {
        return isEIP712SupportedFirmwareVersion
      }
      default:
        return false
    }
  }, [wallet, isEIP712SupportedFirmwareVersion, isDemoWallet])

  return result
}
