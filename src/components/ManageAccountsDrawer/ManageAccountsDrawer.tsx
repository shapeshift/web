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

  const isLedger = false

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
        onClose()
        break
      default:
        assertUnreachable(step)
    }
  }, [isLedger, onClose, step])

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
        return <SelectChain onSelectChainId={handleSelectChainId} onClose={onClose} />
      case 'ledgerOpenApp':
        // TODO: Implement LedgerOpenApp component
        return null
      case 'importAccounts':
        if (!selectedChainId) return null
        return <ImportAccounts chainId={selectedChainId} onClose={onClose} />
      default:
        assertUnreachable(step)
    }
  }, [handleSelectChainId, onClose, selectedChainId, step])

  return (
    <DrawerWrapper isOpen={isOpen} onClose={onClose}>
      {drawerContent}
    </DrawerWrapper>
  )
}
