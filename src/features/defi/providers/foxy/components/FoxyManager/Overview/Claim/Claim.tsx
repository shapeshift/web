import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { ClaimRoutes } from './ClaimRoutes'

export const Claim = () => {
  const translate = useTranslate()
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
        <DefiModalHeader onBack={handleBack} title={translate('common.claim')} />
        <ClaimRoutes onBack={handleBack} />
      </MemoryRouter>
    </SlideTransition>
  )
}
