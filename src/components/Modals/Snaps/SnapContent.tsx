import { MemoryRouter, Redirect, Route, Switch } from 'react-router'

import { SnapConfirm } from './SnapConfirm'
import { SnapIntro } from './SnapIntro'

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
            <Redirect exact from='/' to='/intro' />
          </Switch>
        )}
      </Route>
    </MemoryRouter>
  )
}
