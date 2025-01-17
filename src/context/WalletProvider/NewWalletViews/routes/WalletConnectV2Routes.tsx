import { useCallback } from 'react'
import type { StaticContext } from 'react-router'
import type { RouteComponentProps } from 'react-router-dom'
import { Route, Switch } from 'react-router-dom'
import { WalletConnectV2Connect } from 'context/WalletProvider/WalletConnectV2/components/Connect'
import { useWallet } from 'hooks/useWallet/useWallet'

export const WalletConnectV2Routes = () => {
  const {
    state: { modalType },
  } = useWallet()

  const render = useCallback(
    (routeProps: RouteComponentProps<{}, StaticContext, unknown>) => (
      <WalletConnectV2Connect {...routeProps} />
    ),
    [],
  )

  if (!modalType) return null

  return (
    <Switch>
      <Route path='*' render={render} />
    </Switch>
  )
}
