import type { AccountId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter, useNavigate } from 'react-router-dom'

import { ClaimRoutes } from './ClaimRoutes'

import { SlideTransition } from '@/components/SlideTransition'
import { DefiModalHeader } from '@/features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'

export const FoxyClaim: React.FC<{
  accountId: AccountId | undefined
}> = ({ accountId }) => {
  const translate = useTranslate()
  const { query, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    navigate({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [navigate, location.pathname, query])

  return (
    <SlideTransition>
      <MemoryRouter>
        <DefiModalHeader onBack={handleBack} title={translate('common.claim')} />
        <ClaimRoutes onBack={handleBack} accountId={accountId} />
      </MemoryRouter>
    </SlideTransition>
  )
}
