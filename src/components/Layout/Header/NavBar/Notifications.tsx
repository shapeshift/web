import { Button } from '@chakra-ui/react'
import { NotificationBell, NotificationFeed } from '@wherever/react-notification-feed'
import { NotificationFeedProvider } from '@wherever/react-notification-feed'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { breakpoints } from 'theme/theme'

export const Notifications = () => {
  const isWhereverEnabled = useFeatureFlag('Wherever')
  if (!isWhereverEnabled) return null

  const disableAnalytics = window.location.hostname.includes('private.shapeshift.com')

  const mobileBreakpoint = Number(breakpoints.md.replace('px', ''))

  //TODO: once Wherever is appointed as a delegate, add the relevant partner key below
  return (
    <NotificationFeedProvider
      env={'staging'}
      theme={{ borderRadius: 'md', mobileBreakpoint }}
      partnerKey={'dea07569-c7b3-445a-ad1a-57f94c1d03d6'}
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
