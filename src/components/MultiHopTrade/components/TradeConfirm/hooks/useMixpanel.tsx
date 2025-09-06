import { useCallback, useMemo } from 'react'

import { getMixpanelEventData } from '@/components/MultiHopTrade/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import type { MixPanelEvent } from '@/lib/mixpanel/types'

export const useMixpanel = (allowUndefinedEventData = false) => {
  const mixpanel = useMemo(() => getMixPanel(), [])
  const trackMixpanelEvent = useCallback(
    (event: MixPanelEvent) => {
      // mixpanel is undefined when the feature is disabled
      if (!mixpanel) return

      const eventData = getMixpanelEventData()
      // Allow tracking without eventData if flag is set
      if (allowUndefinedEventData || eventData) {
        mixpanel.track(event, eventData)
      }
    },
    [mixpanel, allowUndefinedEventData],
  )

  return trackMixpanelEvent
}
