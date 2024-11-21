import { LanguageTypeEnum } from 'constants/LanguageTypeEnum'
import type { Location } from 'history'
import { lazy, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { matchPath, Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { makeSuspenseful } from 'utils/makeSuspenseful'
import { Layout } from 'components/Layout/Layout'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useQuery } from 'hooks/useQuery/useQuery'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile } from 'lib/globals'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const Flags = makeSuspenseful(
  lazy(() => import('pages/Flags/Flags').then(({ Flags }) => ({ default: Flags }))),
)
const Yat = makeSuspenseful(
  lazy(() => import('pages/Yat/Yat').then(({ Yat }) => ({ default: Yat }))),
)
const NotFound = makeSuspenseful(
  lazy(() => import('pages/NotFound/NotFound').then(({ NotFound }) => ({ default: NotFound }))),
)
const ConnectWallet = makeSuspenseful(
  lazy(() =>
    import('pages/ConnectWallet/ConnectWallet').then(({ ConnectWallet }) => ({
      default: ConnectWallet,
    })),
  ),
)
const TermsOfService = makeSuspenseful(
  lazy(() =>
    import('pages/Legal/TermsOfService').then(({ TermsOfService }) => ({
      default: TermsOfService,
    })),
  ),
)
const PrivacyPolicy = makeSuspenseful(
  lazy(() =>
    import('pages/Legal/PrivacyPolicy').then(({ PrivacyPolicy }) => ({ default: PrivacyPolicy })),
  ),
)

export const Routes = memo(() => {
  const dispatch = useDispatch()
  const location = useLocation<{ background: Location }>()
  const history = useHistory()
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
    const selectedLocaleExists = selectedLocale in LanguageTypeEnum ?? {}
    if (lang && selectedLocaleExists && selectedLocale !== lang) {
      dispatch(preferences.actions.setSelectedLocale({ locale: lang }))
    } else if (!selectedLocaleExists) {
      // Set default language if locale in settings is not supported
      dispatch(preferences.actions.setSelectedLocale({ locale: 'en' }))
    }
    // Delete "lang" param from URL once handled.
    if (lang) {
      const params = new URLSearchParams(location.search)
      params.delete('lang')
      history.push({
        pathname: location.pathname,
        search: params.toString(),
      })
    }
  }, [lang, dispatch, selectedLocale, location, history])

  useEffect(() => {
    // Set <html> language attribute
    document.querySelector('html')?.setAttribute('lang', selectedLocale)
  }, [selectedLocale])

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

  /**
   * Memoize the route list to avoid unnecessary cascading re-renders
   * It should only re-render if the wallet changes
   */
  const appRoutesList = useMemo(
    () =>
      appRoutes.map(route => {
        const MainComponent = route.main

        if (isMobile && !state.isConnected) {
          const to = {
            pathname: '/connect-wallet',
            search: `returnUrl=${location?.pathname ?? '/trade'}`,
          }

          // eslint-disable-next-line react-memo/require-usememo
          return <Redirect to={to} />
        }

        return (
          <Route key={'route'} path={route.path}>
            {MainComponent && <MainComponent />}
          </Route>
        )
      }),
    // We *actually* want to be reactive on the location.pathname reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appRoutes, hasWallet, location],
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
      <Route>
        <Layout>
          <Switch>
            {appRoutesList}
            <Redirect from='/' to='/trade' />
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </Layout>
      </Route>
    </Switch>
  )
})
