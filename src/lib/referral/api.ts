import type { AxiosError } from 'axios'
import axios from 'axios'

import type {
  CreateReferralCodeRequest,
  CreateReferralCodeResponse,
  ReferralApiError,
  ReferralStats,
} from './types'

const USER_SERVER_URL = import.meta.env.VITE_USER_SERVER_URL

const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; code?: string }>
    const message = axiosError.response?.data?.message || axiosError.message
    const code = axiosError.response?.data?.code
    const statusCode = axiosError.response?.status

    const apiError = new Error(message) as ReferralApiError
    apiError.name = 'ReferralApiError'
    apiError.code = code
    apiError.statusCode = statusCode

    throw apiError
  }
  throw error
}

export const getReferralStatsByOwner = async (
  ownerAddress: string,
  startDate?: Date,
  endDate?: Date,
): Promise<ReferralStats> => {
  if (!USER_SERVER_URL) {
    throw new Error('User server URL is not configured')
  }

  try {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate.toISOString())
    if (endDate) params.append('endDate', endDate.toISOString())

    const response = await axios.get<ReferralStats>(
      `${USER_SERVER_URL}/referrals/stats/${ownerAddress}${
        params.toString() ? `?${params.toString()}` : ''
      }`,
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      },
    )
    return response.data
  } catch (error) {
    return handleApiError(error)
  }
}

export const createReferralCode = async (
  request: CreateReferralCodeRequest,
): Promise<CreateReferralCodeResponse> => {
  if (!USER_SERVER_URL) {
    throw new Error('User server URL is not configured')
  }

  try {
    const response = await axios.post<CreateReferralCodeResponse>(
      `${USER_SERVER_URL}/referrals/codes`,
      request,
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      },
    )
    return response.data
  } catch (error) {
    return handleApiError(error)
  }
}
