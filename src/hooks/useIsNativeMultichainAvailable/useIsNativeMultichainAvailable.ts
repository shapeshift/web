import type { Wallet } from '@wallet-standard/base'
import { useEffect, useMemo, useState } from 'react'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { getWalletStandardStore } from '@/lib/walletStandard'

const MM_WALLET_NAME = 'MetaMask'

const hasMmWalletForChain = (wallets: readonly Wallet[], chainPrefix: string): boolean =>
  wallets.some(
    w => w.name === MM_WALLET_NAME && w.chains.some(c => c.startsWith(`${chainPrefix}:`)),
  )

const disabledResult = { isBtcAvailable: false, isSolAvailable: false, isAnyAvailable: false }

export const useIsNativeMultichainAvailable = () => {
  const isMmNativeMultichainEnabled = useFeatureFlag('MmNativeMultichain')

  const [state, setState] = useState({ isBtcAvailable: false, isSolAvailable: false })

  useEffect(() => {
    if (!isMmNativeMultichainEnabled) return

    const walletsApi = getWalletStandardStore()

    const check = () => {
      const wallets = walletsApi.get()
      setState({
        isBtcAvailable: hasMmWalletForChain(wallets, 'bitcoin'),
        isSolAvailable: hasMmWalletForChain(wallets, 'solana'),
      })
    }

    check()

    const unsubscribe = walletsApi.on('register', check)
    return unsubscribe
  }, [isMmNativeMultichainEnabled])

  return useMemo(() => {
    if (!isMmNativeMultichainEnabled) return disabledResult
    return { ...state, isAnyAvailable: state.isBtcAvailable || state.isSolAvailable }
  }, [isMmNativeMultichainEnabled, state])
}
