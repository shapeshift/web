import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { getExpoToken } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { getStoredReferralCode } from '@/hooks/useReferralCapture/useReferralCapture'
import { isMobile } from '@/lib/globals'
import { getOrCreateUser, getOrRegisterDevice } from '@/lib/user/api'
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
  const isWebServicesEnabled = useFeatureFlag('WebServices')

  const {
    data: mobileExpoToken,
    isLoading: isLoadingExpoToken,
    error: expoTokenError,
  } = useQuery({
    queryKey: ['expoToken'],
    queryFn: isMobile && isWebServicesEnabled ? getExpoToken : skipToken,
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
    queryFn:
      walletEnabledAccountIds.length > 0 && isWebServicesEnabled
        ? () => {
            const referralCode = getStoredReferralCode()
            return getOrCreateUser({
              accountIds: walletEnabledAccountIds,
              ...(referralCode && { referralCode }),
            })
          }
        : skipToken,
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
    queryFn:
      userData && (!isMobile || !isLoadingExpoToken) && isWebServicesEnabled
        ? async () => {
            const { deviceToken, deviceType } = (() => {
              if (isMobile && mobileExpoToken) {
                return {
                  deviceToken: mobileExpoToken,
                  deviceType: DeviceType.Mobile,
                }
              }

              const storedDeviceToken = localStorage.getItem('deviceToken')
              const deviceToken = storedDeviceToken ?? uuidv4()
              if (!storedDeviceToken) {
                localStorage.setItem('deviceToken', deviceToken)
              }

              return {
                deviceToken,
                deviceType: DeviceType.Web,
              }
            })()

            const response = await getOrRegisterDevice({
              userId: userData.id,
              deviceToken,
              deviceType,
            })

            return {
              device: response.device,
              expoToken: isMobile ? mobileExpoToken : null,
            }
          }
        : skipToken,
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
