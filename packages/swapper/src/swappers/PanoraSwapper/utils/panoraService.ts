import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const PANORA_API_BASE = 'https://api.panora.exchange'

type PanoraService = ReturnType<typeof makeSwapperAxiosServiceMonadic>

let cachedService: PanoraService | undefined
let cachedApiKey: string | undefined

export const getPanoraService = (apiKey: string): PanoraService => {
  if (!cachedService || cachedApiKey !== apiKey) {
    const service = createCache(5000, ['/swap'], {
      baseURL: PANORA_API_BASE,
      timeout: 10000,
      headers: {
        Accept: 'application/json',
        'x-api-key': apiKey,
      },
    })
    cachedService = makeSwapperAxiosServiceMonadic(service)
    cachedApiKey = apiKey
  }
  return cachedService
}
