import { useColorMode } from '@chakra-ui/react'
import { IconButton } from '@chakra-ui/react'
import type { CustomTheme } from '@wherever/react-notification-feed'
import { NotificationBell, NotificationFeed } from '@wherever/react-notification-feed'
import { NotificationFeedProvider } from '@wherever/react-notification-feed'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { breakpoints } from 'theme/theme'
import { theme } from 'theme/theme'

export const Notifications = () => {
  const isWhereverEnabled = useFeatureFlag('Wherever')
  const { colorMode } = useColorMode()

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

  if (!isWhereverEnabled) return null

  const disableAnalytics = window.location.hostname.includes('private.shapeshift.com')
  const partnerKey = getConfig().REACT_APP_WHEREVER_PARTNER_KEY

  return (
    <NotificationFeedProvider
      partnerKey={partnerKey}
      theme={themeObj}
      disableAnalytics={disableAnalytics}
    >
      <NotificationFeed>
        <IconButton aria-label='Open notifications'>
          <NotificationBell size={20} />
        </IconButton>
      </NotificationFeed>
    </NotificationFeedProvider>
  )
}
