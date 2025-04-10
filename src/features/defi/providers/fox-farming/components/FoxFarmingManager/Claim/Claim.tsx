import type { AccountId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback } from 'react'
import { MemoryRouter, useNavigate } from 'react-router-dom'

import { ClaimRoutes } from './ClaimRoutes'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { SlideTransition } from '@/components/SlideTransition'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'

type ClaimProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Claim: React.FC<ClaimProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const navigate = useNavigate()
  const { query, location } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const handleBack = useCallback(() => {
    navigate({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [query, location.pathname, navigate])

  return (
    <SlideTransition>
      <MemoryRouter>
        <ClaimRoutes
          accountId={accountId}
          onAccountIdChange={handleAccountIdChange}
          onBack={handleBack}
        />
      </MemoryRouter>
    </SlideTransition>
  )
}
