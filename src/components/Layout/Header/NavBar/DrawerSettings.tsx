import { Box } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { ClearCache } from '@/components/Modals/Settings/ClearCache'
import { CurrencyFormat } from '@/components/Modals/Settings/CurrencyFormat'
import { FiatCurrencies } from '@/components/Modals/Settings/FiatCurrencies'
import { Languages } from '@/components/Modals/Settings/Languages'
import { SettingsRoutes, SettingsRoutesRelative } from '@/components/Modals/Settings/SettingsCommon'
import { SettingsContent } from '@/components/Modals/Settings/SettingsContent'
import { Text } from '@/components/Text'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'

type DrawerSettingsProps = {
  onBack: () => void
  onClose?: () => void
}

const languagesElement = <Languages isDrawer />
const fiatCurrenciesElement = <FiatCurrencies isDrawer />
const currencyFormatElement = <CurrencyFormat isDrawer />
const clearCacheElement = <ClearCache isDrawer />

export const DrawerSettings: FC<DrawerSettingsProps> = ({ onBack, onClose }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { navigate: browserNavigate } = useBrowserRouter()
  const [clickCount, setClickCount] = useState<number>(0)

  // Ensure that we back out of memory routing back to main route when on main settings route and clicking back
  const handleBackClick = useCallback(() => {
    if (location.pathname === SettingsRoutes.Index) {
      onBack()
    } else {
      navigate(-1)
    }
  }, [location.pathname, navigate, onBack])

  /**
   * clicking 5 times on the settings header will close this view and take you to the flags page
   * useful for QA team and unlikely to be triggered by a regular user
   */
  const handleHeaderClick = useCallback(() => {
    if (clickCount === 4) {
      setClickCount(0)
      onClose?.()
      browserNavigate('/flags')
    } else {
      setClickCount(clickCount + 1)
    }
  }, [clickCount, setClickCount, onClose, browserNavigate])

  const settingsContentElement = useMemo(() => <SettingsContent onClose={onClose} />, [onClose])

  return (
    <Box display='flex' flexDirection='column' height='100%'>
      <DialogHeader onClick={handleHeaderClick}>
        <DialogHeader.Left>
          <DialogBackButton onClick={handleBackClick} />
        </DialogHeader.Left>
        <DialogHeader.Middle>
          <Text translation='modals.settings.settings' fontWeight='medium' />
        </DialogHeader.Middle>
      </DialogHeader>
      <Box flex='1' overflow='auto' maxHeight={'100%'}>
        <Routes>
          <Route path={SettingsRoutesRelative.Index} element={settingsContentElement} />
          <Route path={SettingsRoutesRelative.Languages} element={languagesElement} />
          <Route path={SettingsRoutesRelative.FiatCurrencies} element={fiatCurrenciesElement} />
          <Route path={SettingsRoutesRelative.CurrencyFormat} element={currencyFormatElement} />
          <Route path={SettingsRoutesRelative.ClearCache} element={clearCacheElement} />
        </Routes>
      </Box>
    </Box>
  )
}
