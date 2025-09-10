import { useCallback, useMemo } from 'react'

import { getMixpanelEventData } from '@/components/MultiHopTrade/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import type { MixPanelEvent } from '@/lib/mixpanel/types'

export const useMixpanel = () => {
  const mixpanel = useMemo(() => getMixPanel(), [])
  const trackMixpanelEvent = useCallback(
    (event: MixPanelEvent) => {
      // mixpanel is undefined when the feature is disabled
      if (!mixpanel) return

      const data = getMixpanelEventData()
      if (data) {
        mixpanel.track(event, data)
      }
    },
    [mixpanel],
  )

  return trackMixpanelEvent
}
