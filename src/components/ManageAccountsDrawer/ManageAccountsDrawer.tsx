import { ethChainId } from '@shapeshiftoss/caip'
import { useEffect, useMemo, useState } from 'react'
import { assertUnreachable } from 'lib/utils'

import { DrawerWrapper } from './components/DrawerWrapper'
import { ImportAccounts } from './components/ImportAccounts'

export type ManageAccountsDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

type ManageAccountsStep = 'manageAccounts' | 'selectChain' | 'ledgerOpenApp' | 'importAccounts'

export const ManageAccountsDrawer = ({ isOpen, onClose }: ManageAccountsDrawerProps) => {
  const [step, setStep] = useState<ManageAccountsStep>('manageAccounts')

  // TEMP: Set the initial step to 'importAccounts' until we have the other steps implemented
  useEffect(() => {
    setStep('importAccounts')
  }, [])

  const drawerContent = useMemo(() => {
    switch (step) {
      case 'manageAccounts':
        // TODO: Implement ManageAccounts component
        return null
      case 'selectChain':
        // TODO: Implement SelectChain component
        return null
      case 'ledgerOpenApp':
        // TODO: Implement LedgerOpenApp component
        return null
      case 'importAccounts':
        return <ImportAccounts chainId={ethChainId} onClose={onClose} />
      default:
        assertUnreachable(step)
    }
  }, [onClose, step])

  return (
    <DrawerWrapper isOpen={isOpen} onClose={onClose}>
      {drawerContent}
    </DrawerWrapper>
  )
}
