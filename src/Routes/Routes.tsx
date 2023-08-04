import { LanguageTypeEnum } from 'constants/LanguageTypeEnum'
import type { Location } from 'history'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
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
import { Yat } from 'pages/Yat/Yat'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { PrivateRoute } from './PrivateRoute'
export const Routes = memo(() => {
  const dispatch = useDispatch()
  const location = useLocation<{ background: Location }>()
  const { connectDemo, state } = useWallet()
  const { appRoutes } = useBrowserRouter()
  const hasWallet = Boolean(state.walletInfo?.deviceId) || state.isLoadingLocalWallet
  const [shouldRedirectDemoRoute, setShouldRedirectDemoRoute] = useState(false)
  const { lang } = useQuery<{ lang: string }>()
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

    state.isDemoWallet ? setShouldRedirectDemoRoute(true) : connectDemo()
  }, [
    matchDemoPath,
    shouldRedirectDemoRoute,
    location.pathname,
    state.isDemoWallet,
    state.isLoadingLocalWallet,
    connectDemo,
  ])

  // Most routes should be stable and not re-render when the location changes
  // However, some routes are unstable and should actually re-render when location.pathname reference changes
  // Which happens both on actual route change, or when the same route gets pushed
  const unstableRoutes = useMemo(() => ['/trade'], [])
  const isUnstableRoute = useMemo(
    () => unstableRoutes.some(route => location.pathname.includes(route)),
    [location.pathname, unstableRoutes],
  )
  /**
   * Memoize the route list to avoid unnecessary cascading re-renders
   * It should only re-render if the wallet changes
   */
  const privateRoutesList = useMemo(
    () =>
      appRoutes.map(route => {
        const MainComponent = route.main
        return (
          <PrivateRoute
            key={isUnstableRoute ? Date.now() : 'privateRoute'}
            path={route.path}
            hasWallet={hasWallet}
          >
            {MainComponent && <MainComponent />}
          </PrivateRoute>
        )
      }),
    // We *actually* want to be reactive on the location.pathname reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appRoutes, hasWallet, isUnstableRoute, location],
  )

  const locationProps = useMemo(() => location.state?.background || location, [location])

  const renderRedirect = useCallback(() => {
    return shouldRedirectDemoRoute ? (
      <Redirect
        from='/'
        to={matchDemoPath?.params.appRoute ? `/${matchDemoPath.params.appRoute}` : '/dashboard'}
      />
    ) : null
  }, [matchDemoPath?.params.appRoute, shouldRedirectDemoRoute])

  return (
    <Switch location={locationProps}>
      <Route path='/demo'>{renderRedirect}</Route>
      <Route path='/yat/:eid'>
        <Yat />
      </Route>
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
      <Layout>
        <Switch>
          {privateRoutesList}
          <Redirect from='/' to='/dashboard' />
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </Layout>
    </Switch>
  )
})
