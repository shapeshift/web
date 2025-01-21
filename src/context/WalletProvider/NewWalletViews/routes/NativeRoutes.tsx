import { Route, Switch } from 'react-router-dom'
import { MobileCreate } from 'context/WalletProvider/MobileWallet/components/MobileCreate'
import { NativeWalletRoutes } from 'context/WalletProvider/types'
import { isMobile as isMobileApp } from 'lib/globals'

import { EnterPassword } from '../../NativeWallet/components/EnterPassword'
import { NativeCreate } from '../../NativeWallet/components/NativeCreate'
import { NativeImportKeystore } from '../../NativeWallet/components/NativeImportKeystore'
import { NativeImportSeed } from '../../NativeWallet/components/NativeImportSeed'
import { NativeImportSelect } from '../../NativeWallet/components/NativeImportSelect'
import { NativePassword } from '../../NativeWallet/components/NativePassword'
import { NativeSuccess } from '../../NativeWallet/components/NativeSuccess'
import { NativeTestPhrase } from '../../NativeWallet/components/NativeTestPhrase'
import type { NativeSetupProps } from '../../NativeWallet/types'
import { NativeStart } from '../wallets/native/NativeStart'

export const NativeRoutes = () => (
  <Switch>
    <Route
      exact
      path={NativeWalletRoutes.Connect}
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativeStart {...routeProps} />}
    />
    <Route
      exact
      path={NativeWalletRoutes.ImportKeystore}
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativeImportKeystore {...routeProps} />}
    />
    <Route
      exact
      path={NativeWalletRoutes.ImportSeed}
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativeImportSeed {...routeProps} />}
    />
    <Route
      exact
      path={NativeWalletRoutes.ImportSelect}
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativeImportSelect {...routeProps} />}
    />
    <Route exact path={NativeWalletRoutes.Create}>
      {isMobileApp ? <MobileCreate /> : <NativeCreate />}
    </Route>
    <Route
      exact
      path={NativeWalletRoutes.Password}
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativePassword {...(routeProps as NativeSetupProps)} />}
    />
    <Route exact path={NativeWalletRoutes.EnterPassword}>
      <EnterPassword />
    </Route>
    <Route
      exact
      path={NativeWalletRoutes.Success}
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativeSuccess {...(routeProps as NativeSetupProps)} />}
    />
    <Route
      exact
      path={NativeWalletRoutes.CreateTest}
      // we need to pass an arg here, so we need an anonymous function wrapper
      // eslint-disable-next-line react-memo/require-usememo
      render={routeProps => <NativeTestPhrase {...(routeProps as NativeSetupProps)} />}
    />
  </Switch>
)
