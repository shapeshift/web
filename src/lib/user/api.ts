import type { AxiosInstance } from 'axios'
import axios from 'axios'

import type { StoredSession } from './deviceIdentity'
import {
  clearStoredSession,
  describeDeviceKey,
  DeviceKeyError,
  getDeviceIdentity,
  readStoredSession,
  resetDeviceIdentity,
  signDeviceChallenge,
  storeSession,
  withDeviceLock,
} from './deviceIdentity'
import type { RegisterDeviceRequest, RegisterDeviceResponse, User } from './types'

import { getPushVerification } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'

let client: AxiosInstance | undefined
let session: StoredSession | undefined
let pending: Promise<StoredSession> | undefined

const getServerUrl = (): string => {
  const baseURL = import.meta.env.VITE_USER_SERVER_URL
  if (!baseURL) throw new Error('User service is not configured')
  return baseURL
}
const getClient = (): AxiosInstance => {
  if (client === undefined) client = axios.create({ baseURL: getServerUrl(), timeout: 10000 })
  return client
}
// Renew a minute early so a request doesn't race the expiry. A slow local clock just means an
// expired token gets one 401 and a renewal.
const isFresh = (value: StoredSession): boolean => Date.parse(value.expiresAt) > Date.now() + 60_000
const isUnauthorized = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 401

const login = async (keys: CryptoKeyPair): Promise<StoredSession> => {
  const server = getServerUrl()
  const { publicKey, keyId } = await describeDeviceKey(keys)
  const stored = await readStoredSession().catch(() => undefined)
  if (stored?.server === server && stored.keyId === keyId && isFresh(stored)) return stored
  const { data: challenge } = await getClient().post<{
    id: string
    message: string
    expiresAt: string
  }>('/auth/device/challenge', { publicKey })
  const signature = await signDeviceChallenge(keys, challenge)
  const { data } = await getClient().post<Omit<StoredSession, 'server' | 'keyId'>>(
    '/auth/device/verify',
    { id: challenge.id, signature },
  )
  if (
    !/^[a-f0-9]{64}$/.test(data.token) ||
    !data.userId ||
    !Number.isFinite(Date.parse(data.expiresAt))
  )
    throw new Error('Invalid device session')
  const next = { server, keyId, token: data.token, userId: data.userId, expiresAt: data.expiresAt }
  await storeSession(next).catch(() => undefined)
  return next
}

export const getDeviceSession = (): Promise<StoredSession> => {
  if (session && isFresh(session)) return Promise.resolve(session)
  if (pending !== undefined) return pending
  // The lock makes other tabs wait and then reuse the stored session rather than all logging in
  pending = withDeviceLock(async () => {
    try {
      return await login(await getDeviceIdentity())
    } catch (error) {
      if (!(error instanceof DeviceKeyError)) throw error
      return login(await resetDeviceIdentity())
    }
  })
    .then(value => {
      session = value
      return value
    })
    .finally(() => {
      pending = undefined
    })
  return pending
}

const discardSession = async (token: string): Promise<void> => {
  if (session?.token === token) session = undefined
  await clearStoredSession(token).catch(() => undefined)
}

export const deviceRequest = async <T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> => {
  const send = async (current: StoredSession): Promise<T> => {
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
      if (isUnauthorized(error)) await discardSession(current.token)
      throw error
    }
  }
  try {
    return await send(await getDeviceSession())
  } catch (error) {
    if (!isUnauthorized(error)) throw error
    return send(await getDeviceSession())
  }
}

// Only retry transient failures: 4xx responses (including rate limits) and push verification
// timeouts won't succeed on retry, and each mobile retry sends another verification push
export const shouldRetryUserRequest = (failureCount: number, error: Error): boolean =>
  failureCount < 3 &&
  axios.isAxiosError(error) &&
  (error.response === undefined || error.response.status >= 500)

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
