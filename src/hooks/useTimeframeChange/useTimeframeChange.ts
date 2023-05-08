import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'

export const useTimeframeChange = (callback: (timeframe: HistoryTimeframe) => void) => {
  const dispatch = useDispatch()
  const handleTimeframeChange = useCallback(
    (newTimeframe: HistoryTimeframe) => {
      // Usually used to set the component state to the new timeframe
      callback(newTimeframe)
      // Save the new timeframe in the user perferences
      dispatch(preferences.actions.setChartTimeframe({ timeframe: newTimeframe }))
    },
    [callback, dispatch],
  )

  return handleTimeframeChange
}
