import { useCallback, useEffect, useMemo, useState } from 'react'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { METAMASK_RDNS } from '@/lib/mipd'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'

const STORAGE_KEY = 'nativeMultichainPreference'

type Preference = 'native' | 'snap' | null

const getStorageKey = (deviceId: string) => `${STORAGE_KEY}_${deviceId}`

const getPreference = (deviceId: string | null | undefined): Preference => {
  if (!deviceId) return null
  const stored = localStorage.getItem(getStorageKey(deviceId))
  if (stored === 'native' || stored === 'snap') return stored
  return null
}

export const useNativeMultichainPreference = (deviceId: string | null | undefined) => {
  const isMmNativeMultichain = useFeatureFlag('MmNativeMultichain')
  const connectedRdns = useAppSelector(selectWalletRdns)
  const { isSnapInstalled } = useIsSnapInstalled()

  const [preference, setPreferenceState] = useState<Preference>(() => getPreference(deviceId))

  // Re-read from localStorage when deviceId becomes available.
  // useState initializer only runs once - if deviceId was null on mount, preference stays null.
  useEffect(() => {
    const stored = getPreference(deviceId)
    setPreferenceState(stored)
  }, [deviceId])

  const setPreference = useCallback(
    (pref: 'native' | 'snap') => {
      if (!deviceId) return
      localStorage.setItem(getStorageKey(deviceId), pref)
      setPreferenceState(pref)
    },
    [deviceId],
  )

  const shouldShowDeprecationModal = useMemo(() => {
    if (!isMmNativeMultichain) return false
    if (connectedRdns !== METAMASK_RDNS) return false
    // Check both React state AND localStorage directly to avoid race condition:
    // useEffect updates preference asynchronously, but this useMemo runs during render.
    // Without the direct localStorage check, there's a window where preference is stale (null)
    // and the modal opens before the effect fires.
    const storedPreference = getPreference(deviceId)
    if (preference !== null || storedPreference !== null) return false
    return true
  }, [isMmNativeMultichain, connectedRdns, preference, deviceId])

  const isNativeMode = useMemo(() => {
    if (!isMmNativeMultichain) return false
    // If preference is explicitly 'native', use native mode
    if (preference === 'native') return true
    // If snap is not installed and flag is on, default to native
    if (isSnapInstalled === false && preference !== 'snap') return true
    return false
  }, [isMmNativeMultichain, preference, isSnapInstalled])

  return useMemo(
    () => ({
      preference,
      setPreference,
      shouldShowDeprecationModal,
      isNativeMode,
    }),
    [preference, setPreference, shouldShowDeprecationModal, isNativeMode],
  )
}
