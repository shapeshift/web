import { useCallback, useMemo } from 'react'

import { getMixpanelEventData } from '@/components/MultiHopTrade/helpers'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import type { MixPanelEvent } from '@/lib/mixpanel/types'

export const useMixpanel = () => {
  const mixpanel = useMemo(() => getMixPanel(), [])
  const {
    state: { connectedType },
  } = useWallet()

  const trackMixpanelEvent = useCallback(
    (event: MixPanelEvent, customEventData?: ReturnType<typeof getMixpanelEventData>) => {
      // Use provided data, or fetch fresh if not provided
      const eventData = customEventData ?? getMixpanelEventData()
      // mixpanel is undefined when the feature is disabled
      if (eventData && mixpanel) {
        console.log('TRACK')
        console.log({ event, eventData, connectedType })
        mixpanel.track(event, { ...eventData, connectedType })
      } else {
        console.log('skipping track')
        console.log({ event, eventData, mixpanel })
      }
    },
    [mixpanel, connectedType],
  )

  return trackMixpanelEvent
}
