import { LanguageTypeEnum } from 'constants/LanguageTypeEnum'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { matchPath, Redirect, Route, Switch, useLocation } from 'react-router-dom'
import { Layout } from 'components/Layout/Layout'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useQuery } from 'hooks/useQuery/useQuery'
import { useWallet } from 'hooks/useWallet/useWallet'
import { ConnectWallet } from 'pages/ConnectWallet/ConnectWallet'
import { Flags } from 'pages/Flags/Flags'
import { PrivacyPolicy } from 'pages/Legal/PrivacyPolicy'
import { TermsOfService } from 'pages/Legal/TermsOfService'
import { NotFound } from 'pages/NotFound/NotFound'
import { Pairings } from 'pages/Pairings/Pairings'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { PrivateRoute } from './PrivateRoute'

function useLocationBackground() {
  const location = useLocation<{ background: any }>()
  const background = location.state && location.state.background
  return { background, location }
}

export const Routes = () => {
  const dispatch = useDispatch()
  const { background, location } = useLocationBackground()
  const { state } = useWallet()
  const { appRoutes } = useBrowserRouter()
  const hasWallet = Boolean(state.walletInfo?.deviceId) || state.isLoadingLocalWallet
  const [shouldRedirectDemoRoute, setShouldRedirectDemoRoute] = useState(false)
  // @ts-ignore
  const { lang } = useQuery()
  const selectedLocale = useAppSelector(selectSelectedLocale)
  const matchDemoPath = matchPath<{ appRoute: string }>(location.pathname, {
    path: ['/demo/:appRoute(.+)', '/demo'],
  })

  useEffect(() => {
    if (lang && LanguageTypeEnum[lang as LanguageTypeEnum] && selectedLocale !== lang) {
      dispatch(preferences.actions.setSelectedLocale({ locale: lang }))
    }
  }, [lang, dispatch, selectedLocale])

  useEffect(() => {
    if (!matchDemoPath && shouldRedirectDemoRoute) return setShouldRedirectDemoRoute(false)
    if (!matchDemoPath || state.isLoadingLocalWallet) return

    setShouldRedirectDemoRoute(true)
  }, [
    matchDemoPath,
    shouldRedirectDemoRoute,
    location.pathname,
    state.isDemoWallet,
    state.isLoadingLocalWallet,
  ])

  /**
   * Memoize the route list to avoid unnecessary cascading re-renders
   * It should only re-render if the wallet changes
   */
  const privateRoutesList = useMemo(
    () =>
      appRoutes.map(route => {
        const MainComponent = route.main
        return (
          <PrivateRoute key={'privateRoute'} path={route.path} exact hasWallet={hasWallet}>
            <Layout>{MainComponent && <MainComponent />}</Layout>
          </PrivateRoute>
        )
      }),
    [appRoutes, hasWallet],
  )

  return (
    <Switch location={background || location}>
      <Route path='/demo'>
        {() => {
          return shouldRedirectDemoRoute ? (
            <Redirect
              from='/'
              to={
                matchDemoPath?.params?.appRoute ? `/${matchDemoPath.params.appRoute}` : '/dashboard'
              }
            />
          ) : null
        }}
      </Route>
      {privateRoutesList}
      <Route path='/connect-wallet'>
        <ConnectWallet />
      </Route>
      <Route path={'/legal/terms-of-service'}>
        <Layout>
          <TermsOfService />
        </Layout>
      </Route>
      <Route path={'/legal/privacy-policy'}>
        <Layout>
          <PrivacyPolicy />
        </Layout>
      </Route>
      <Route path='/flags'>
        <Layout>
          <Flags />
        </Layout>
      </Route>
      <Route path='/pairings'>
        <Layout>
          <Pairings />
        </Layout>
      </Route>
      <Redirect from='/' to='/dapps' />
      <Route component={NotFound} />
    </Switch>
  )
}
