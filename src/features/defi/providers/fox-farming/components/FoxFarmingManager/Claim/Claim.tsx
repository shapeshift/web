import type { AccountId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { MemoryRouter } from 'react-router'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { ClaimRoutes } from './ClaimRoutes'

type ClaimProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Claim: React.FC<ClaimProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const handleBack = () => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }

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
