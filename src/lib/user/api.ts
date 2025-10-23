import type { AxiosError } from 'axios'
import axios from 'axios'

import type {
  GetOrCreateUserRequest,
  RegisterDeviceRequest,
  RegisterDeviceResponse,
  User,
  UserError,
} from './types'

const USER_SERVER_URL = import.meta.env.VITE_USER_SERVER_URL

class UserApiError extends Error {
  code?: string
  statusCode?: number

  constructor(message: string, code?: string, statusCode?: number) {
    super(message)
    this.name = 'UserApiError'
    this.code = code
    this.statusCode = statusCode
  }
}

const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>
    const message =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message ||
      'An unknown error occurred'
    const statusCode = axiosError.response?.status

    throw new UserApiError(message, axiosError.code, statusCode)
  }

  if (error instanceof Error) {
    throw new UserApiError(error.message)
  }

  throw new UserApiError('An unknown error occurred')
}

export const getOrCreateUser = async (request: GetOrCreateUserRequest): Promise<User> => {
  if (!USER_SERVER_URL) {
    throw new UserApiError('User server URL is not configured', 'CONFIG_ERROR')
  }

  if (!request.accountIds || request.accountIds.length === 0) {
    throw new UserApiError('At least one account ID is required', 'VALIDATION_ERROR')
  }

  try {
    const response = await axios.post<User>(`${USER_SERVER_URL}/users/get-or-create`, request, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const user = response.data

    return user
  } catch (error) {
    return handleApiError(error)
  }
}

export const registerDevice = async (
  request: RegisterDeviceRequest,
): Promise<RegisterDeviceResponse> => {
  if (!USER_SERVER_URL) {
    throw new UserApiError('User server URL is not configured', 'CONFIG_ERROR')
  }

  if (!request.userId) {
    throw new UserApiError('User ID is required', 'VALIDATION_ERROR')
  }

  if (!request.deviceToken) {
    throw new UserApiError('Device token is required', 'VALIDATION_ERROR')
  }

  try {
    const response = await axios.post<RegisterDeviceResponse>(
      `${USER_SERVER_URL}/users/${request.userId}/devices`,
      {
        deviceToken: request.deviceToken,
        deviceType: request.deviceType,
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    return response.data
  } catch (error) {
    return handleApiError(error)
  }
}

export { UserApiError }
export type { UserError }
