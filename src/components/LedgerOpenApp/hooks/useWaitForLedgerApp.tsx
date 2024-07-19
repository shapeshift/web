import type { ChainId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useCallback, useEffect } from 'react'
import { getSlip44KeyFromChainId } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { useWallet } from 'hooks/useWallet/useWallet'

type LedgerOpenAppProps = {
  chainId: ChainId
  onReady: (() => void) | undefined
}

export const useWaitForLedgerApp = ({ chainId, onReady }: LedgerOpenAppProps) => {
  const wallet = useWallet().state.wallet

  const checkIsCorrectAppOpen = useCallback(async () => {
    const slip44Key = getSlip44KeyFromChainId(chainId)

    const ledgerWallet = wallet && isLedger(wallet) ? wallet : undefined
    if (!ledgerWallet || !slip44Key) return false
    try {
      await ledgerWallet.validateCurrentApp(slip44Key)
      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }, [chainId, wallet])

  useEffect(() => {
    // Don't start polling until the onReady callback is set
    if (!onReady) return

    // Poll the Ledger every second to see if the correct app is open
    const intervalId = setInterval(async () => {
      const isValidApp = await checkIsCorrectAppOpen()
      if (isValidApp) {
        clearInterval(intervalId)
        onReady()
      }
    }, 1000)

    return () => clearInterval(intervalId) // Clean up on component unmount
  }, [checkIsCorrectAppOpen, onReady])
}
