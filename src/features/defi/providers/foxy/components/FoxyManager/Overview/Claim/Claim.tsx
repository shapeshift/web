import { MemoryRouter, useHistory } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'

import { ClaimRoutes } from './ClaimRoutes'

enum OverviewPath {
  Overview = '/',
  Claim = '/',
  ClaimStatus = '/status'
}

export const routes = [
  { step: 0, path: OverviewPath.Claim, label: 'Confirm' },
  { step: 1, path: OverviewPath.ClaimStatus, label: 'Status' }
]

export const Claim = () => {
  const history = useHistory()

  const handleBack = () => {
    history.push('/')
  }

  return (
    <SlideTransition>
      <MemoryRouter>
        <ClaimRoutes onBack={handleBack} />
      </MemoryRouter>
    </SlideTransition>
  )
}
