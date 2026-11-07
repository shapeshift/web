import axios from 'axios'

import { exportDevicePublicKey, getDeviceIdentity, signDeviceChallenge } from './deviceIdentity'
import type { RegisterDeviceRequest, RegisterDeviceResponse, User } from './types'

import { getPushVerification } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'

const getClient = () => {
  const baseURL = import.meta.env.VITE_USER_SERVER_URL
  if (!baseURL) throw new Error('User service is not configured')
  return axios.create({ baseURL, timeout: 10000 })
}
type Session = { token: string; userId: string; expiresAt: string }
let session: Session | undefined
let pending: Promise<Session> | undefined

export const getDeviceSession = (): Promise<Session> => {
  if (session && Date.parse(session.expiresAt) > Date.now() + 30_000)
    return Promise.resolve(session)
  if (pending !== undefined) return pending
  pending = (async () => {
    const client = getClient()
    const keys = await getDeviceIdentity()
    const publicKey = await exportDevicePublicKey(keys)
    const { data: challenge } = await client.post<{
      id: string
      message: string
      expiresAt: string
    }>('/auth/device/challenge', { publicKey })
    const signature = await signDeviceChallenge(keys, challenge)
    const { data } = await client.post<Session>('/auth/device/verify', {
      id: challenge.id,
      signature,
    })
    if (
      !/^[a-f0-9]{64}$/.test(data.token) ||
      !data.userId ||
      !Number.isFinite(Date.parse(data.expiresAt)) ||
      Date.parse(data.expiresAt) <= Date.now()
    )
      throw new Error('Invalid device session')
    session = data
    return data
  })().finally(() => {
    pending = undefined
  })
  return pending
}

export const deviceRequest = async <T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> => {
  const current = await getDeviceSession()
  try {
    return (
      await getClient().request<T>({
        method,
        url: path,
        data,
        headers: { Authorization: `Bearer ${current.token}` },
      })
    ).data
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error
    if (session?.token === current.token) session = undefined
    const refreshed = await getDeviceSession()
    return (
      await getClient().request<T>({
        method,
        url: path,
        data,
        headers: { Authorization: `Bearer ${refreshed.token}` },
      })
    ).data
  }
}

export const getUser = (): Promise<User> => deviceRequest('GET', '/me')
export const getOrRegisterDevice = async (
  request: RegisterDeviceRequest,
): Promise<RegisterDeviceResponse> => {
  const data = await deviceRequest<RegisterDeviceResponse | { registrationId: string }>(
    'POST',
    '/me/devices',
    { deviceToken: request.deviceToken, deviceType: request.deviceType },
  )
  if ('device' in data) return data
  for (const attempt of Array.from({ length: 30 }, (_, index) => index)) {
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 1000))
    const nonce = await getPushVerification(data.registrationId)
    if (nonce)
      return deviceRequest('POST', '/me/devices/confirm', {
        registrationId: data.registrationId,
        nonce,
      })
  }
  throw new Error('Push verification was not received; retry with the app open')
}
