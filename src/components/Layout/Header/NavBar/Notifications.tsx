import { Box, IconButton, useColorMode } from '@chakra-ui/react'
import type { CustomTheme } from '@wherever/react-notification-feed'
import {
  NotificationBell,
  NotificationFeed,
  NotificationFeedProvider,
} from '@wherever/react-notification-feed'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { getLocalWalletType } from 'context/WalletProvider/local-wallet'
import { isKeyManagerWithProvider } from 'context/WalletProvider/WalletProvider'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { breakpoints, theme } from 'theme/theme'

export const Notifications = () => {
  const isWhereverEnabled = useFeatureFlag('Wherever')
  const { colorMode } = useColorMode()

  const currentWallet = getLocalWalletType()
  const mobileBreakpoint = Number(breakpoints.md.replace('px', ''))

  const themeObj: CustomTheme = useMemo(() => {
    const baseTheme =
      colorMode === 'light'
        ? {
            primaryColor: theme.colors.primary,
            backgroundColor: theme.colors.gray[100],
            textColor: theme.colors.gray[800],
            bellColor: theme.colors.gray[700],
          }
        : {
            textColor: theme.colors.gray[50],
          }
    return {
      ...baseTheme,
      borderRadius: 'md',
      mobileBreakpoint,
    }
  }, [colorMode, mobileBreakpoint])

  if (!isWhereverEnabled || !currentWallet || !isKeyManagerWithProvider(currentWallet)) return null

  const disableAnalytics = true
  const partnerKey = getConfig().REACT_APP_WHEREVER_PARTNER_KEY

  return (
    <Box>
      <NotificationFeedProvider
        partnerKey={partnerKey}
        theme={themeObj}
        disableAnalytics={disableAnalytics}
      >
        <NotificationFeed gapFromBell={10}>
          <IconButton aria-label='Open notifications'>
            <NotificationBell size={20} />
          </IconButton>
        </NotificationFeed>
      </NotificationFeedProvider>
    </Box>
  )
}
