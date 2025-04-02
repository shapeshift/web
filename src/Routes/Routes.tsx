import type { Location } from 'history'
import { lazy, memo, useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { Layout } from '@/components/Layout/Layout'
import { LanguageTypeEnum } from '@/constants/LanguageTypeEnum'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useQuery } from '@/hooks/useQuery/useQuery'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isMobile } from '@/lib/globals'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectSelectedLocale } from '@/state/slices/selectors'
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

export const AppRoutes = memo(() => {
  const dispatch = useDispatch()
  const location = useLocation() as Location & { state?: { background: Location } }
  const navigate = useNavigate()
  const { state } = useWallet()
  const { appRoutes } = useBrowserRouter()
  const hasWallet = Boolean(state.walletInfo?.deviceId) || state.isLoadingLocalWallet
  const { lang } = useQuery<{ lang: string }>()
  const selectedLocale = useAppSelector(selectSelectedLocale)

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
          const to = {
            pathname: '/connect-mobile-wallet',
            search: `returnUrl=${location?.pathname ?? '/trade'}`,
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
      <Route path='/connect-mobile-wallet' element={<MobileConnect />} />
      <Route
        path='/legal/terms-of-service'
        element={
          <Layout>
            <TermsOfService />
          </Layout>
        }
      />
      <Route
        path='/legal/privacy-policy'
        element={
          <Layout>
            <PrivacyPolicy />
          </Layout>
        }
      />
      <Route
        path='/flags'
        element={
          <Layout>
            <Flags />
          </Layout>
        }
      />
      <Route
        path='/*'
        element={
          <Layout>
            <InnerRoutes appRoutesList={appRoutesList} />
          </Layout>
        }
      />
    </Routes>
  )
})

// Separate component for inner routes to avoid nested Routes rendering issues
const InnerRoutes = ({ appRoutesList }: { appRoutesList: React.ReactNode[] }) => {
  return (
    <Routes>
      {appRoutesList}
      <Route path='/' element={<Navigate to='/trade' replace />} />
      <Route path='*' element={<NotFound />} />
    </Routes>
  )
}
