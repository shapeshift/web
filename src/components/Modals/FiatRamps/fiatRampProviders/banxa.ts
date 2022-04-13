import axios from 'axios'
import crypto from 'crypto-browserify'

import { FiatRampAction, FiatRampCurrency } from '../FiatRampsCommon'

const generateHmac = (config: { method: 'GET' | 'POST'; path: string; payload: {} | null }) => {
  // TODO(stackedQ): change the following to use env vars once Banxa API_KEY and SECRET is ready
  const key = '[YOUR_MERCHANT_KEY]'
  const secret = '[YOUR_MERCHANT_SECRET]'

  const nonce = new Date().getTime()
  let payload: string | null = null
  if (config.payload) payload = JSON.stringify(config.payload)

  // https://docs.banxa.com/docs/step-3-authentication#signature
  let data = config.method + '\n' + config.path + '\n' + nonce
  if (payload) data += '\n' + payload

  const localSignature = crypto.createHmac('SHA256', secret).update(data).digest('hex')
  return `${key}:${localSignature}:${nonce}`
}

type BanxaCoin = {
  coin_code: string
  coin_name: string
}

export const getCoins = async () => {
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${generateHmac({
      method: <const>'GET',
      path: '/api/coins',
      payload: null,
    })}`,
  }
  try {
    // TODO(stackedQ): fix the following endpoint after getting Banxa's API_KEY
    const {
      data: { coins },
    } = await axios.get<{ coins: BanxaCoin[] }>('https://api.banxa.com/api/coins', { headers })
    // TODO(stackedQ): make sure to parse the coins correctly
    const parsedCoins: FiatRampCurrency[] = coins.map(c => {
      // TODO(stackedQ): add the CAIP to coin_code map in the `lib` and fix here
      const caip19 = ''
      return {
        symbol: c.coin_code,
        name: c.coin_name,
        caip19,
        imageUrl: '',
      }
    })
    return parsedCoins
  } catch (error) {
    console.error('Banxa(getCoins): failed')
    return []
  }
}

type BanxaOrder = {
  checkout_url: string
}
export const createBanxaOrder = async (
  action: FiatRampAction,
  asset: string,
  address: string,
): Promise<string> => {
  const payload = {
    account_reference: address,
    wallet_address: address,
    wallet_address_tag: '',
    // TODO(stackedQ): probably need to add more fiat currency support for the following
    source: action === FiatRampAction.Buy ? 'USD' : asset,
    target: action === FiatRampAction.Buy ? asset : 'USD',
    return_url_on_success: window.location.origin,
    refund_address: action === FiatRampAction.Buy ? null : address,
  }
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${generateHmac({
      method: <const>'POST',
      path: '/api/coins',
      payload,
    })}`,
  }
  // TODO(stackedQ): fix the following endpoint after getting Banxa's API_KEY
  try {
    const {
      data: { order },
    } = await axios.post<{ order: BanxaOrder }>('https://api.banxa.com/api/orders', payload, {
      headers,
    })
    return order.checkout_url
  } catch (error) {
    console.error(`Banxa(createOrder): failed ${error}`)
    throw error
  }
}
