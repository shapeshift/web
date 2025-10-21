import { lazy, memo, useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { Layout } from '@/components/Layout/Layout'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { LanguageTypeEnum } from '@/constants/LanguageTypeEnum'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useQuery } from '@/hooks/useQuery/useQuery'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isMobile } from '@/lib/globals'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppSelector } from '@/state/store'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const Flags = makeSuspenseful(
  lazy(() => import('@/pages/Flags/Flags').then(({ Flags }) => ({ default: Flags }))),
)
const NotFound = makeSuspenseful(
  lazy(() => import('@/pages/NotFound/NotFound').then(({ NotFound }) => ({ default: NotFound }))),
)

const TermsOfService = makeSuspenseful(
  lazy(() =>
    import('@/pages/Legal/TermsOfService').then(({ TermsOfService }) => ({
      default: TermsOfService,
    })),
  ),
)
const PrivacyPolicy = makeSuspenseful(
  lazy(() =>
    import('@/pages/Legal/PrivacyPolicy').then(({ PrivacyPolicy }) => ({ default: PrivacyPolicy })),
  ),
)

const MobileConnect = makeSuspenseful(
  lazy(() =>
    import('@/pages/ConnectWallet/MobileConnect').then(({ MobileConnect }) => ({
      default: MobileConnect,
    })),
  ),
)

const tradeRedirect = <Navigate to={TradeRoutePaths.Input} replace />
const walletEarnRedirect = <Navigate to='/wallet/earn' replace />

const InnerRoutes = ({ appRoutesList }: { appRoutesList: React.ReactNode[] }) => {
  return (
    <Routes>
      {appRoutesList}
      <Route path='/' element={tradeRedirect} />
      {/* Handle legacy /connect-wallet/* routes by redirecting to main app route. We don't expose these anymore, but users may have old bookmarks */}
      <Route path='/connect-wallet/*' element={tradeRedirect} />
      {/* Handle legacy /earn/* routes by redirecting to wallet/earn route. We don't expose these anymore, but users may have old bookmarks */}
      <Route path='/earn/*' element={walletEarnRedirect} />
      {/* Don't memoize me - this takes no props in, and this paranoia ensures that this lazy loads */}
      {/* eslint-disable-next-line react-memo/require-usememo */}
      <Route path='*' element={<NotFound />} />
    </Routes>
  )
}

export const AppRoutes = memo(() => {
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = useWallet()
  const { appRoutes } = useBrowserRouter()
  const hasWallet = Boolean(state.walletInfo?.deviceId) || state.isLoadingLocalWallet
  const { lang } = useQuery<{ lang: string }>()
  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)

  useEffect(() => {
    const selectedLocaleExists = selectedLocale in LanguageTypeEnum
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
      navigate({
        pathname: location.pathname,
        search: params.toString(),
      })
    }
  }, [lang, dispatch, selectedLocale, location, navigate])

  useEffect(() => {
    // Set <html> language attribute
    document.querySelector('html')?.setAttribute('lang', selectedLocale)
  }, [selectedLocale])

  /**
   * Memoize the route list to avoid unnecessary cascading re-renders
   * It should only re-render if the wallet changes
   */
  const appRoutesList = useMemo(
    () =>
      appRoutes.map(route => {
        const MainComponent = route.main

        if (isMobile && !state.isConnected) {
          // Preserve both pathname and search params for deep links like /wc?uri=...
          const fullPath = location.pathname + location.search
          const to = {
            pathname: '/connect-mobile-wallet',
            search: `returnUrl=${encodeURIComponent(fullPath || TradeRoutePaths.Input)}`,
          }

          return (
            <Route
              key={'redirect-route'}
              path={route.path}
              // This is already within a useMemo call, lint rule drunk
              // eslint-disable-next-line react-memo/require-usememo
              element={<Navigate to={to} replace />}
            />
          )
        }

        return (
          <Route
            key={'route'}
            path={route.path}
            // This is already within a useMemo call, lint rule drunk
            // eslint-disable-next-line react-memo/require-usememo
            element={MainComponent ? <MainComponent /> : null}
          />
        )
      }),
    // We *actually* want to be reactive on the location.pathname reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appRoutes, hasWallet, location],
  )

  return (
    <Routes>
      {/* Don't memoize me - this takes no props in, and this paranoia ensures that this lazy loads */}
      {/* eslint-disable-next-line react-memo/require-usememo */}
      <Route path='/connect-mobile-wallet' element={<MobileConnect />} />
      <Route
        path='/legal/terms-of-service'
        // Don't memoize me - this takes no props in, and this paranoia ensures that this lazy loads
        // eslint-disable-next-line react-memo/require-usememo
        element={
          <Layout>
            <TermsOfService />
          </Layout>
        }
      />
      <Route
        path='/legal/privacy-policy'
        // Don't memoize me - this takes no props in, and this paranoia ensures that this lazy loads
        // eslint-disable-next-line react-memo/require-usememo
        element={
          <Layout>
            <PrivacyPolicy />
          </Layout>
        }
      />
      <Route
        path='/flags'
        // Don't memoize me - this takes no props in, and this paranoia ensures that this lazy loads
        // eslint-disable-next-line react-memo/require-usememo
        element={
          <Layout>
            <Flags />
          </Layout>
        }
      />
      <Route
        path='/*'
        // Don't memoize me - this takes no props in, and this paranoia ensures that this lazy loads
        // eslint-disable-next-line react-memo/require-usememo
        element={
          <Layout maxWidth='full' px='0'>
            <InnerRoutes appRoutesList={appRoutesList} />
          </Layout>
        }
      />
    </Routes>
  )
})
