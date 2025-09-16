import { Box } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
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

type DrawerSettingsProps = {
  onBack: () => void
}

export const DrawerSettings: FC<DrawerSettingsProps> = ({ onBack }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const handleBackClick = useCallback(() => {
    if (location.pathname === SettingsRoutes.Index) {
      onBack()
    } else {
      navigate(-1)
    }
  }, [location.pathname, navigate, onBack])

  const settingsContentElement = useMemo(() => <SettingsContent />, [])
  const languagesElement = useMemo(() => <Languages isDrawer />, [])
  const fiatCurrenciesElement = useMemo(() => <FiatCurrencies isDrawer />, [])
  const currencyFormatElement = useMemo(() => <CurrencyFormat isDrawer />, [])
  const clearCacheElement = useMemo(() => <ClearCache isDrawer />, [])

  return (
    <Box display='flex' flexDirection='column' height='100%'>
      <DialogHeader>
        <DialogHeader.Left>
          <DialogBackButton onClick={handleBackClick} />
        </DialogHeader.Left>
        <DialogHeader.Middle>
          <Text translation='modals.settings.settings' fontWeight='medium' />
        </DialogHeader.Middle>
      </DialogHeader>
      <Box flex='1' overflow='auto' maxHeight={'100%'} className='scroll-container'>
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
