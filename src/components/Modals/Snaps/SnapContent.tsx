import { MemoryRouter, Redirect, Route, Switch } from 'react-router-dom'

import { SnapConfirm } from './SnapConfirm'
import { SnapIntro } from './SnapIntro'

const introRedirect = () => <Redirect to='/intro' />

export const SnapContent = ({
  isRemoved,
  isCorrectVersion,
  isSnapInstalled,
  onClose,
}: {
  isRemoved?: boolean
  isCorrectVersion: boolean
  isSnapInstalled: boolean
  onClose: () => void
}) => {
  return (
    <MemoryRouter>
      <Route>
        {({ location }) => (
          <Switch key={location.key} location={location}>
            <Route path='/intro'>
              <SnapIntro
                isRemoved={isRemoved}
                isCorrectVersion={isCorrectVersion}
                isSnapInstalled={isSnapInstalled}
              />
            </Route>
            <Route path='/confirm'>
              <SnapConfirm onClose={onClose} />
            </Route>
            <Route path='/' exact render={introRedirect} />
          </Switch>
        )}
      </Route>
    </MemoryRouter>
  )
}
