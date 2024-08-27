import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { useWallet } from 'hooks/useWallet/useWallet'

import { DrawerWrapper } from './components/DrawerWrapper'
import { ImportAccounts } from './components/ImportAccounts'
import { SelectChain } from './components/SelectChain'

export type ManageAccountsDrawerProps = {
  isOpen: boolean
  chainId: ChainId | null
  onClose: () => void
}

type ManageAccountsStep = 'selectChain' | 'importAccounts'

export const ManageAccountsDrawer = ({
  isOpen,
  onClose,
  chainId: parentSelectedChainId,
}: ManageAccountsDrawerProps) => {
  const wallet = useWallet().state.wallet
  const [step, setStep] = useState<ManageAccountsStep>('selectChain')
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null)

  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: false })

  const handleClose = useCallback(() => {
    setStep('selectChain')
    onClose()
  }, [onClose])

  const handleNext = useCallback(() => {
    if (!wallet) return
    switch (step) {
      case 'selectChain':
        setStep('importAccounts')
        break
      case 'importAccounts':
        handleClose()
        break
      default:
        return step satisfies never
    }
  }, [wallet, step, handleClose])

  // Set the selected chainId from parent if required
  useEffect(() => {
    setSelectedChainId(parentSelectedChainId)
  }, [parentSelectedChainId])

  // Skip chain selection if chainId is already selected by parent
  useEffect(() => {
    if (step === 'selectChain' && parentSelectedChainId !== null) {
      handleNext()
    }
  }, [parentSelectedChainId, handleNext, step])

  // Reset the step if the parent chainId is reset
  useEffect(() => {
    if (parentSelectedChainId === null) {
      setStep('selectChain')
    }
  }, [parentSelectedChainId])

  const handleSelectChainId = useCallback(
    async (chainId: ChainId) => {
      setSelectedChainId(chainId)

      // Only proceed to next step if the promise is resolved, i.e the user has opened the Ledger
      // app without cancelling
      await checkLedgerAppOpenIfLedgerConnected(chainId)
        .then(() => handleNext())
        .catch(console.error)
    },
    [checkLedgerAppOpenIfLedgerConnected, handleNext],
  )

  const drawerContent = useMemo(() => {
    switch (step) {
      case 'selectChain':
        return <SelectChain onSelectChainId={handleSelectChainId} onClose={handleClose} />
      case 'importAccounts':
        if (!selectedChainId) return null
        return <ImportAccounts chainId={selectedChainId} onClose={handleClose} />
      default:
        return step satisfies never
    }
  }, [step, handleSelectChainId, handleClose, selectedChainId])

  return (
    <DrawerWrapper isOpen={isOpen} onClose={handleClose}>
      {drawerContent}
    </DrawerWrapper>
  )
}
