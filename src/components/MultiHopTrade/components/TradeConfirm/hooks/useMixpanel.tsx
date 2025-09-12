import { useCallback, useMemo } from 'react'

import type { getMixpanelEventData } from '@/components/MultiHopTrade/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import type { MixPanelEvent } from '@/lib/mixpanel/types'

export const useMixpanel = (eventData: ReturnType<typeof getMixpanelEventData>) => {
  const mixpanel = useMemo(() => getMixPanel(), [])
  const trackMixpanelEvent = useCallback(
    (event: MixPanelEvent) => {
      // mixpanel is undefined when the feature is disabled
      if (eventData && mixpanel) mixpanel.track(event, eventData)
    },
    [eventData, mixpanel],
  )

  return trackMixpanelEvent
}
