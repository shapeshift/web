import { useCallback, useMemo } from 'react'

import { getMixpanelEventData } from '@/components/MultiHopTrade/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import type { MixPanelEvent } from '@/lib/mixpanel/types'

export const useMixpanel = () => {
  const mixpanel = useMemo(() => getMixPanel(), [])
  const eventData = useMemo(() => getMixpanelEventData(), [])
  const trackMixpanelEvent = useCallback(
    (event: MixPanelEvent) => {
      // mixpanel is undefined when the feature is disabled
      if (eventData && mixpanel) mixpanel.track(event, eventData)
    },
    [eventData, mixpanel],
  )

  return trackMixpanelEvent
}
