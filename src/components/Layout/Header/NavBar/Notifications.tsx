import { Button } from '@chakra-ui/react'
import { useColorMode } from '@chakra-ui/react'
import type { CustomTheme } from '@wherever/react-notification-feed'
import { NotificationBell, NotificationFeed } from '@wherever/react-notification-feed'
import { NotificationFeedProvider } from '@wherever/react-notification-feed'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { breakpoints } from 'theme/theme'
import { theme } from 'theme/theme'

export const Notifications = () => {
  const isWhereverEnabled = useFeatureFlag('Wherever')
  const { colorMode } = useColorMode()

  if (!isWhereverEnabled) return null

  const disableAnalytics = window.location.hostname.includes('private.shapeshift.com')

  const mobileBreakpoint = Number(breakpoints.md.replace('px', ''))

  const themeOptions: CustomTheme =
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

  return (
    <NotificationFeedProvider
      env={'staging'} // TODO(nivo33): Remove before PR is merged
      partnerKey={process.env.REACT_APP_WHEREVER_PARTNER_KEY as string}
      theme={{
        borderRadius: 'md',
        mobileBreakpoint,
        ...themeOptions,
      }}
      disableAnalytics={disableAnalytics}
    >
      <NotificationFeed>
        <Button colorScheme='blue' variant='ghost-filled'>
          <NotificationBell />
        </Button>
      </NotificationFeed>
    </NotificationFeedProvider>
  )
}
