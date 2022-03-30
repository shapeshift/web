import { MemoryRouter, useHistory } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'

import { ClaimRoutes } from './ClaimRoutes'

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
