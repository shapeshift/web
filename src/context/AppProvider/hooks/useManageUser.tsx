import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useCallback } from 'react'

import { getExpoToken } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { isMobile } from '@/lib/globals'
import { selectWalletEnabledAccountIds } from '@/state/slices/common-selectors'
import { useAppSelector } from '@/state/store'

interface UserResponse {
  id: string
  email: string
  userAccounts: {
    id: string
    accountId: string
  }[]
  devices: {
    id: string
    deviceToken: string
    deviceType: 'MOBILE' | 'WEB'
    isActive: boolean
  }[]
}

interface UserInitResponse {
  user: UserResponse
  websocketChannel?: string
  expoToken?: string
}

const getUserOrCreate = async (accountIds: string[]): Promise<UserInitResponse> => {
  const serverUrl = import.meta.env.VITE_USER_SERVER_URL

  if (!serverUrl) {
    throw new Error('SWAPS_SERVER_URL not configured')
  }

  try {
    const response = await axios.post(`${serverUrl}/users/get-or-create`, {
      accountIds,
    })

    const user = response.data

    const websocketChannel = `user:${user.id}`

    return {
      user,
      websocketChannel,
    }
  } catch (error) {
    console.error('Failed to get or create user:', error)
    throw error
  }
}

const registerDevice = async (
  userId: string,
  deviceToken: string,
  deviceType: 'MOBILE' | 'WEB',
): Promise<void> => {
  const serverUrl = import.meta.env.VITE_USER_SERVER_URL

  const response = await axios.post(`${serverUrl}/users/${userId}/devices`, {
    userId,
    deviceToken,
    deviceType,
  })

  return response.data
}

export const useManageUser = () => {
  const walletEnabledAccountIds = useAppSelector(selectWalletEnabledAccountIds)

  const { data: mobileExpoToken } = useQuery({
    queryKey: ['getExpoToken'],
    queryFn: () => getExpoToken(),
    enabled: isMobile,
    gcTime: Infinity,
    staleTime: Infinity,
  })

  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['getOrCreateUser', ...walletEnabledAccountIds],
    queryFn: () => getUserOrCreate(walletEnabledAccountIds),
    enabled: walletEnabledAccountIds.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const initializeUserWithDevice = useCallback(
    async (expoToken: string | null | undefined) => {
      if (!userData?.user) return

      try {
        let deviceToken: string
        let deviceType: 'MOBILE' | 'WEB'

        if (isMobile && expoToken) {
          deviceToken = expoToken
          deviceType = 'MOBILE'
        } else {
          deviceToken = userData.websocketChannel || `user:${userData.user.id}`
          deviceType = 'WEB'
        }

        await registerDevice(userData.user.id, deviceToken, deviceType)

        return {
          userId: userData.user.id,
          expoToken: isMobile ? expoToken : undefined,
          websocketChannel: userData.websocketChannel,
        }
      } catch (error) {
        console.error('Failed to initialize user with device:', error)
        throw error
      }
    },
    [userData],
  )

  const { data: deviceData } = useQuery({
    queryKey: ['registerDevice', userData?.user?.id, mobileExpoToken],
    queryFn: () => initializeUserWithDevice(mobileExpoToken),
    enabled: !!userData?.user?.id,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  return {
    user: userData?.user,
    expoToken: deviceData?.expoToken,
    websocketChannel: deviceData?.websocketChannel,
    isLoading,
    error,
    initializeUserWithDevice,
  }
}
