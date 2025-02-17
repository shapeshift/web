import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertUnreachable } from 'lib/utils'

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

  const handleClose = useCallback(() => {
    if (parentSelectedChainId === null) {
      setStep('selectChain')
    }
    onClose()
  }, [onClose, parentSelectedChainId])

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
        assertUnreachable(step)
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
    (chainId: ChainId) => {
      setSelectedChainId(chainId)
      handleNext()
    },
    [handleNext],
  )

  const drawerContent = useMemo(() => {
    switch (step) {
      case 'selectChain':
        return (
          <SelectChain
            onSelectChainId={handleSelectChainId}
            onClose={handleClose}
            isOpen={isOpen}
          />
        )
      case 'importAccounts':
        if (!selectedChainId) return null
        return <ImportAccounts chainId={selectedChainId} onClose={handleClose} isOpen={isOpen} />
      default:
        assertUnreachable(step)
    }
  }, [step, handleSelectChainId, handleClose, selectedChainId, isOpen])

  return drawerContent
}
