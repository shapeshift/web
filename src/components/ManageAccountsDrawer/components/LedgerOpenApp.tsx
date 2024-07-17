import { Button } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useWaitForLedgerApp } from 'components/LedgerOpenApp/hooks/useWaitForLedgerApp'
import { LedgerOpenApp as LedgerOpenAppBody } from 'components/LedgerOpenApp/LedgerOpenApp'

import { DrawerContentWrapper } from './DrawerContent'

export type LedgerOpenAppProps = {
  chainId: ChainId
  onClose: () => void
  onNext: () => void
}

export const LedgerOpenApp = ({ chainId, onClose, onNext }: LedgerOpenAppProps) => {
  const translate = useTranslate()

  useWaitForLedgerApp({ chainId, onReady: onNext })

  const body = useMemo(() => {
    return <LedgerOpenAppBody chainId={chainId} onReady={onNext} />
  }, [chainId, onNext])

  return (
    <DrawerContentWrapper
      body={body}
      footer={
        <>
          <Button colorScheme='gray' mr={3} onClick={onClose}>
            {translate('common.cancel')}
          </Button>
          <Button colorScheme='blue' isDisabled>
            {translate('common.next')}
          </Button>
        </>
      }
    />
  )
}
