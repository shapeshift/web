import type { ChainId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useCallback } from 'react'
import { getSlip44KeyFromChainId } from 'components/LedgerOpenApp/hooks/useWaitForLedgerApp'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

export const useLedgerOpenApp = () => {
  const { close: closeModal, open: openModal } = useModal('openLedgerApp')

  const wallet = useWallet().state.wallet

  const checkIsCorrectAppOpen = useCallback(
    async (chainId: ChainId) => {
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
    },
    [wallet],
  )

  const checkLedgerApp = useCallback(
    (chainId: ChainId) => {
      return new Promise<void>(async (resolve, reject) => {
        // If the ledger app is already open, resolve the promise immediately
        const isValidApp = await checkIsCorrectAppOpen(chainId)
        if (isValidApp) {
          resolve()
          return
        }

        // Set a callback to reject the promise when the user cancels the request
        const onCancel = () => {
          closeModal()
          reject()
        }

        // Display the request to open the Ledger app
        openModal({ chainId, onCancel })

        // Poll the Ledger every second to see if the correct app is open
        const intervalId = setInterval(async () => {
          const isValidApp = await checkIsCorrectAppOpen(chainId)
          if (isValidApp) {
            closeModal()
            clearInterval(intervalId)
            resolve()
          }
        }, 1000)
      })
    },
    [checkIsCorrectAppOpen, closeModal, openModal],
  )

  return checkLedgerApp
}
