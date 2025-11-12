import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { getExpoToken } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { isMobile } from '@/lib/globals'
import { getOrCreateUser, registerDevice } from '@/lib/user/api'
import type { User } from '@/lib/user/types'
import { DeviceType } from '@/lib/user/types'
import { selectWalletEnabledAccountIds } from '@/state/slices/common-selectors'
import { useAppSelector } from '@/state/store'

type UseUserData = {
  user: User | null
  expoToken: string | null | undefined
  isLoadingUser: boolean
  isLoadingDevice: boolean
  isLoading: boolean
  error: Error | null
  refetchUser: () => void
  refetchDevice: () => void
}

export const useUser = (): UseUserData => {
  const walletEnabledAccountIds = useAppSelector(selectWalletEnabledAccountIds)
  const isWebservicesEnabled = useFeatureFlag('Webservices')

  const {
    data: mobileExpoToken,
    isLoading: isLoadingExpoToken,
    error: expoTokenError,
  } = useQuery({
    queryKey: ['expoToken'],
    queryFn: getExpoToken,
    enabled: isMobile && isWebservicesEnabled,
    gcTime: Infinity,
    staleTime: Infinity,
  })

  const {
    data: userData,
    isLoading: isLoadingUser,
    error: userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['user', walletEnabledAccountIds],
    queryFn: () => getOrCreateUser({ accountIds: walletEnabledAccountIds }),
    enabled: walletEnabledAccountIds.length > 0 && isWebservicesEnabled,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const {
    data: deviceData,
    isLoading: isLoadingDevice,
    error: deviceError,
    refetch: refetchDevice,
  } = useQuery({
    queryKey: ['device', userData?.id, mobileExpoToken],
    queryFn: async () => {
      if (!userData) {
        throw new Error('User data is required to register device')
      }

      let deviceToken: string
      let deviceType: DeviceType

      if (isMobile && mobileExpoToken) {
        deviceToken = mobileExpoToken
        deviceType = DeviceType.Mobile
      } else {
        deviceToken = uuidv4()
        deviceType = DeviceType.Web
      }

      const response = await registerDevice({
        userId: userData.id,
        deviceToken,
        deviceType,
      })

      return {
        device: response.device,
        expoToken: isMobile ? mobileExpoToken : null,
      }
    },
    enabled: !!userData && (!isMobile || !isLoadingExpoToken) && isWebservicesEnabled,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const user = useMemo(() => userData ?? null, [userData])
  const expoToken = useMemo(() => deviceData?.expoToken ?? null, [deviceData?.expoToken])

  const isLoading = isLoadingUser || isLoadingDevice || (isMobile && isLoadingExpoToken)
  const error = userError ?? deviceError ?? expoTokenError ?? null

  return {
    user,
    expoToken,
    isLoadingUser,
    isLoadingDevice,
    isLoading,
    error,
    refetchUser,
    refetchDevice,
  }
}
