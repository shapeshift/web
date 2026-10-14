import type { AssetId } from '@shapeshiftoss/caip'
import { adapters, fromAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { parseSiweMessage, validateSiweMessage } from 'viem/siwe'

import { FiatRampAction } from '../../FiatRampsCommon'
import type { CreateUrlProps } from '../../types'
import type { OnRamperGatewaysResponse } from './types'
import {
  findAssetIdByOnramperCrypto,
  findOnramperTokenIdByAssetId,
  getSupportedOnramperCurrencies,
} from './utils'
import type { OnramperWalletAuth } from './walletAuth'
import { OnramperCheckoutError } from './walletAuth'

import { getConfig } from '@/config'

const sessions = new WeakMap<
  OnramperWalletAuth,
  { scope: string; token: string; expiresAt: number }
>()

export const getOnRamperAssets = async (): Promise<AssetId[]> => {
  const data = await getSupportedOnramperCurrencies()
  if (!data) return []
  return convertOnRamperDataToFiatRampAsset(data)
}

const convertOnRamperDataToFiatRampAsset = (response: OnRamperGatewaysResponse): AssetId[] => {
  return Array.from(
    new Set(
      response.message.crypto
        .map(currency => findAssetIdByOnramperCrypto(currency))
        .filter((assetId): assetId is AssetId => Boolean(assetId?.startsWith('eip155:'))),
    ),
  )
}

export const createOnRamperUrl = async ({
  action,
  assetId,
  address,
  fiatCurrency,
  fiatAmount,
  amountCryptoPrecision,
  options,
  walletAuth,
}: CreateUrlProps): Promise<string> => {
  const baseURL = getConfig().VITE_ONRAMPER_SIGNING_URL
  if (!baseURL) throw new Error('Onramper checkout service is not configured')
  const { chainId: caipChainId } = fromAssetId(assetId)
  if (!caipChainId.startsWith('eip155:') || !walletAuth)
    throw new OnramperCheckoutError('fiatRamps.onramperWalletUnsupported')
  const chainId = Number(caipChainId.split(':')[1])
  walletAuth.assertActive()
  const currencies = await getSupportedOnramperCurrencies()
  if (!currencies) throw new Error('Onramper currencies unavailable')
  const crypto =
    adapters.assetIdToOnRamperTokenList(assetId)?.[0] ??
    findOnramperTokenIdByAssetId(assetId, currencies)
  if (!crypto) throw new Error('Asset not supported by Onramper')
  const client = axios.create({ baseURL, timeout: 10000 })
  const scope = `${baseURL}:${window.location.origin}:${chainId}:${address.toLowerCase()}`
  const cached = sessions.get(walletAuth)
  const session = await (async () => {
    if (cached?.scope === scope && cached.expiresAt > Date.now() + 30_000) return cached
    const { data: challenge } = await client.post<{ id: string; message: string }>(
      '/onramper/auth/challenge',
      { address, chainId },
    )
    const message = parseSiweMessage(challenge.message)
    if (
      !validateSiweMessage({
        message,
        address: address as `0x${string}`,
        domain: window.location.host,
        scheme: window.location.protocol.slice(0, -1),
      }) ||
      message.version !== '1' ||
      Boolean(message.resources?.length) ||
      message.chainId !== chainId ||
      message.uri !== `${window.location.origin}/onramper` ||
      message.requestId !== challenge.id ||
      !message.expirationTime ||
      message.expirationTime.getTime() > Date.now() + 5 * 60_000 + 10_000 ||
      message.statement !==
        'Authorize ShapeShift Onramper checkout to this wallet. This does not authorize a blockchain transaction.'
    )
      throw new OnramperCheckoutError('fiatRamps.onramperCheckoutFailed')
    const signature = await walletAuth.signMessage(challenge.message, address, caipChainId)
    walletAuth.assertActive()
    const { data: verified } = await client.post<{
      token: string
      address: string
      chainId: number
      expiresAt: string
    }>('/onramper/auth/verify', { id: challenge.id, signature })
    if (
      verified.address.toLowerCase() !== address.toLowerCase() ||
      verified.chainId !== chainId ||
      !/^[a-f0-9]{64}$/.test(verified.token) ||
      !Number.isFinite(Date.parse(verified.expiresAt)) ||
      Date.parse(verified.expiresAt) <= Date.now() ||
      Date.parse(verified.expiresAt) > Date.now() + 15 * 60_000 + 10_000
    )
      throw new OnramperCheckoutError('fiatRamps.onramperCheckoutFailed')
    walletAuth.assertActive()
    const authorized = { scope, token: verified.token, expiresAt: Date.parse(verified.expiresAt) }
    sessions.set(walletAuth, authorized)
    return authorized
  })()
  walletAuth.assertActive()
  const headers = { Authorization: `Bearer ${session.token}` }
  try {
    const { data: intent } = await client.post<{ id: string; token: string }>(
      '/onramper/intents',
      {
        crypto,
        chainId,
        fiat: fiatCurrency.toUpperCase(),
        action,
        amount: action === FiatRampAction.Sell ? amountCryptoPrecision : fiatAmount,
        language: options.language,
        theme: options.mode,
        redirectUrl: options.currentUrl,
      },
      { headers },
    )
    walletAuth.assertActive()
    const { data } = await client.post<{ url: string }>(
      `/onramper/intents/${encodeURIComponent(intent.id)}/checkout`,
      { token: intent.token },
      { headers },
    )
    const url = new URL(data.url)
    const expected = new URL(getConfig().VITE_ONRAMPER_WIDGET_URL)
    if (
      url.origin !== expected.origin ||
      (url.protocol !== 'https:' &&
        !(
          import.meta.env.DEV &&
          url.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(url.hostname)
        )) ||
      url.username ||
      url.password ||
      url.pathname !== '/'
    )
      throw new Error('Invalid checkout URL')
    walletAuth.assertActive()
    return url.href
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) sessions.delete(walletAuth)
    throw error
  }
}
