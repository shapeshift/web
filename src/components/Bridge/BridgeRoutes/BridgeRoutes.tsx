import { AnimatePresence } from 'framer-motion'
import type { RouteComponentProps } from 'react-router-dom'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'

import { useBridgeRoutes } from '../hooks/useBridgeRoutes'
import { BridgeRoutePaths } from '../types'
import { BridgeInput } from './BridgeInput'
import { Confirm } from './Confirm'
import { SelectAsset } from './SelectAsset'
import { SelectChain } from './SelectChain'
import { Status } from './Status'

export const entries = ['/send/details', '/send/confirm']

export const BridgeRoutes = () => {
  const location = useLocation()
  const { handleAssetClick, handleFromChainClick, handleToChainClick } = useBridgeRoutes()

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route
          path={BridgeRoutePaths.SelectAsset}
          render={(props: RouteComponentProps) => (
            <SelectAsset onClick={handleAssetClick} {...props} />
          )}
        />
        <Route
          path={BridgeRoutePaths.ChainFromSelect}
          render={(props: RouteComponentProps) => (
            <SelectChain onClick={handleFromChainClick} {...props} />
          )}
        />
        <Route
          path={BridgeRoutePaths.ChainToSelect}
          render={(props: RouteComponentProps) => (
            <SelectChain onClick={handleToChainClick} {...props} />
          )}
        />
        <Route path={BridgeRoutePaths.Input} component={BridgeInput} />
        <Route path={BridgeRoutePaths.Confirm} component={Confirm} />
        <Route path={BridgeRoutePaths.Status} component={Status} />
        <Redirect from='/' to={BridgeRoutePaths.Input} />
      </Switch>
    </AnimatePresence>
  )
}
