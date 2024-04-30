import type { ChainId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertUnreachable } from 'lib/utils'

import { DrawerWrapper } from './components/DrawerWrapper'
import { ImportAccounts } from './components/ImportAccounts'
import { LedgerOpenApp } from './components/LedgerOpenApp'
import { SelectChain } from './components/SelectChain'

export type ManageAccountsDrawerProps = {
  isOpen: boolean
  chainId: ChainId | null
  onClose: () => void
}

type ManageAccountsStep = 'selectChain' | 'ledgerOpenApp' | 'importAccounts'

export const ManageAccountsDrawer = ({
  isOpen,
  onClose,
  chainId: parentSelectedChainId,
}: ManageAccountsDrawerProps) => {
  const wallet = useWallet().state.wallet
  const [step, setStep] = useState<ManageAccountsStep>('selectChain')
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null)

  // TODO: Implement Ledger specific logic
  const isLedgerWallet = wallet ? isLedger(wallet) : false

  const handleClose = useCallback(() => {
    setStep('selectChain')
    onClose()
  }, [onClose])

  const handleNext = useCallback(() => {
    switch (step) {
      case 'selectChain':
        if (isLedgerWallet) {
          setStep('ledgerOpenApp')
        } else {
          setStep('importAccounts')
        }
        break
      case 'ledgerOpenApp':
        setStep('importAccounts')
        break
      case 'importAccounts':
        handleClose()
        break
      default:
        assertUnreachable(step)
    }
  }, [step, isLedgerWallet, handleClose])

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
        return <SelectChain onSelectChainId={handleSelectChainId} onClose={handleClose} />
      case 'ledgerOpenApp':
        if (!selectedChainId) return null
        return <LedgerOpenApp chainId={selectedChainId} onClose={handleClose} />
      case 'importAccounts':
        if (!selectedChainId) return null
        return <ImportAccounts chainId={selectedChainId} onClose={handleClose} />
      default:
        assertUnreachable(step)
    }
  }, [handleSelectChainId, handleClose, selectedChainId, step])

  const drawVariant = step === 'ledgerOpenApp' ? 'centered' : undefined

  return (
    <DrawerWrapper isOpen={isOpen} onClose={handleClose} variant={drawVariant}>
      {drawerContent}
    </DrawerWrapper>
  )
}
