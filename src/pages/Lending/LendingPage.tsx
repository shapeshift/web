import type { GridProps } from '@chakra-ui/react'
import { Route, Switch, useRouteMatch } from 'react-router'

import { AvailablePools } from './AvailablePools'
import { Pool } from './Pool/Pool'
import { YourLoans } from './YourLoans'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '200px repeat(5, 1fr)',
}

export const LendingPage = () => {
  const { path } = useRouteMatch()

  return (
    <Switch>
      <Route exact path={`${path}`}>
        <AvailablePools />
      </Route>
      <Route exact path={`${path}/loans`}>
        <YourLoans />
      </Route>
      <Route path={`${path}/poolAccount/:poolAccountId/:poolAssetId`}>
        <Pool />
      </Route>
      <Route path={`${path}/pool/:poolAssetId`}>
        <Pool />
      </Route>
    </Switch>
  )
}
