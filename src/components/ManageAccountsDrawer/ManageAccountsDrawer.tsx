import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { assertUnreachable } from 'lib/utils'

import { DrawerWrapper } from './components/DrawerWrapper'
import { ImportAccounts } from './components/ImportAccounts'
import { SelectChain } from './components/SelectChain'

export type ManageAccountsDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

type ManageAccountsStep = 'selectChain' | 'ledgerOpenApp' | 'importAccounts'

export const ManageAccountsDrawer = ({ isOpen, onClose }: ManageAccountsDrawerProps) => {
  const [step, setStep] = useState<ManageAccountsStep>('selectChain')
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null)

  // TODO: Implement Ledger specific logic
  const isLedger = false

  const handleClose = useCallback(() => {
    setStep('selectChain')
    onClose()
  }, [onClose])

  const handleNext = useCallback(() => {
    switch (step) {
      case 'selectChain':
        if (isLedger) {
          setStep('ledgerOpenApp')
        }
        setStep('importAccounts')
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
  }, [isLedger, handleClose, step])

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
<<<<<<< HEAD
        return <SelectChain onSelectChainId={handleSelectChainId} onClose={handleClose} />
=======
        return <SelectChain onSelectChainId={handleSelectChainId} onClose={onClose} />
>>>>>>> c2805a1157 (feat: improve select chain next and cancel buttons)
      case 'ledgerOpenApp':
        // TODO: Implement LedgerOpenApp component
        return null
      case 'importAccounts':
        if (!selectedChainId) return null
        return <ImportAccounts chainId={selectedChainId} onClose={handleClose} />
      default:
        assertUnreachable(step)
    }
  }, [handleSelectChainId, handleClose, selectedChainId, step])

  return (
    <DrawerWrapper isOpen={isOpen} onClose={handleClose}>
      {drawerContent}
    </DrawerWrapper>
  )
}
