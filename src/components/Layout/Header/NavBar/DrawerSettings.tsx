import { Box } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Route, Switch } from 'wouter'

import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { ClearCache } from '@/components/Modals/Settings/ClearCache'
import { CurrencyFormat } from '@/components/Modals/Settings/CurrencyFormat'
import { FiatCurrencies } from '@/components/Modals/Settings/FiatCurrencies'
import { Languages } from '@/components/Modals/Settings/Languages'
import { SettingsRoutes } from '@/components/Modals/Settings/SettingsCommon'
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
        <Switch location={location.pathname}>
          <Route path={SettingsRoutes.Index}>
            <SettingsContent />
          </Route>
          <Route path={SettingsRoutes.Languages}>
            <Languages isDrawer />
          </Route>
          <Route path={SettingsRoutes.FiatCurrencies}>
            <FiatCurrencies isDrawer />
          </Route>
          <Route path={SettingsRoutes.CurrencyFormat}>
            <CurrencyFormat isDrawer />
          </Route>
          <Route path={SettingsRoutes.ClearCache}>
            <ClearCache isDrawer />
          </Route>
        </Switch>
      </Box>
    </Box>
  )
}