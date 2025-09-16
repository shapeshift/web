import type { FC } from 'react'
import { useCallback } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { Route, Switch } from 'wouter'

import { DrawerClearCache } from './components/DrawerClearCache'
import { DrawerCurrencyFormat } from './components/DrawerCurrencyFormat'
import { DrawerFiatCurrencies } from './components/DrawerFiatCurrencies'
import { DrawerLanguages } from './components/DrawerLanguages'
import { drawerSettingsEntries, DrawerSettingsRoutes } from './DrawerSettingsRoutes'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
import { SettingsContent } from '@/components/Modals/Settings/SettingsContent'

type DrawerSettingsRouterProps = {
  onBack: () => void
  onClose?: () => void
  onBackClick: (handler: () => void) => void
}

const DrawerSettingsRouterInner: FC<DrawerSettingsRouterProps> = ({
  onBack,
  onClose,
  onBackClick,
}) => {
  const location = useLocation()
  const navigate = useNavigate()

  const handleBackClick = useCallback(() => {
    // If we're at the root settings route, go back to main drawer
    if (location.pathname === DrawerSettingsRoutes.Index) {
      onBack()
    } else {
      // Otherwise, navigate back one step in the router history
      navigate(-1)
    }
  }, [navigate, location.pathname, onBack])

  // Provide the back handler to the parent
  onBackClick(handleBackClick)

  const renderSettingsContent = useCallback(() => {
    return <SettingsContent onClose={onClose} />
  }, [onClose])

  const renderLanguages = useCallback(() => {
    return <DrawerLanguages />
  }, [])

  const renderFiatCurrencies = useCallback(() => {
    return <DrawerFiatCurrencies />
  }, [])

  const renderCurrencyFormat = useCallback(() => {
    return <DrawerCurrencyFormat />
  }, [])

  const renderClearCache = useCallback(() => {
    return <DrawerClearCache />
  }, [])

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={DrawerSettingsRoutes.Index}>{renderSettingsContent()}</Route>
        <Route path={DrawerSettingsRoutes.Languages}>{renderLanguages()}</Route>
        <Route path={DrawerSettingsRoutes.FiatCurrencies}>{renderFiatCurrencies()}</Route>
        <Route path={DrawerSettingsRoutes.CurrencyFormat}>{renderCurrencyFormat()}</Route>
        <Route path={DrawerSettingsRoutes.ClearCache}>{renderClearCache()}</Route>
      </Switch>
    </AnimatedSwitch>
  )
}

export const DrawerSettingsRouter: FC<DrawerSettingsRouterProps> = ({
  onBack,
  onClose,
  onBackClick,
}) => {
  return (
    <MemoryRouter initialEntries={drawerSettingsEntries} initialIndex={0}>
      <DrawerSettingsRouterInner onBack={onBack} onClose={onClose} onBackClick={onBackClick} />
    </MemoryRouter>
  )
}
